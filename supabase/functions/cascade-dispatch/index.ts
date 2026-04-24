import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ride_id } = await req.json()
    
    if (!ride_id) {
      throw new Error('ride_id is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Log start
    console.log(`Starting cascade dispatch for ride: ${ride_id}`)

    const radii = [100, 200, 400, 500, 700, 1000]
    let dispatched = false

    for (const radius of radii) {
      if (dispatched) break;
      
      console.log(`Searching in radius: ${radius}m`)

      // 1. Find potential drivers in the current radius
      // find_drivers_in_radius should return drivers ordered by distance
      const { data: drivers, error: findError } = await supabase.rpc('find_drivers_in_radius', {
        p_ride_id: ride_id,
        p_radius_meters: radius
      })

      if (findError) {
        console.error(`Error finding drivers: ${findError.message}`)
        continue
      }

      if (!drivers || drivers.length === 0) {
        console.log(`No drivers found in ${radius}m`)
        continue
      }

      // 2. Iterate through found drivers
      for (const driver of drivers) {
        console.log(`Attempting dispatch to driver: ${driver.id}`)

        // Atomically mark driver as busy and assign to ride
        const { data: assignResult, error: assignError } = await supabase.rpc('dispatch_nearest_driver', {
          p_ride_id: ride_id,
          p_driver_id: driver.id
        })

        if (assignError || !assignResult) {
          console.log(`Could not assign driver ${driver.id}: ${assignError?.message || 'Result empty'}`)
          continue
        }

        // 3. Send Push Notification
        // Calling another Edge Function for notification
        try {
          await supabase.functions.invoke('push-notification', {
            body: {
              user_id: driver.id,
              title: 'New Ride Request',
              message: 'You have 15 seconds to accept a nearby ride!',
              data: { ride_id }
            }
          })
        } catch (pushErr) {
          console.warn('Push notification failed but continuing:', pushErr)
        }

        // 4. Wait for driver response (15 seconds)
        // We poll the database for status change or use a timeout
        const waitTime = 15000
        const pollInterval = 2000
        let elapsed = 0
        let accepted = false

        while (elapsed < waitTime) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))
          elapsed += pollInterval

          // Check if driver accepted
          const { data: ride, error: checkError } = await supabase
            .from('rides')
            .select('status, driver_id')
            .eq('id', ride_id)
            .single()

          if (checkError) break;

          // If status moved beyond 'requested' and same driver is assigned, they accepted
          // Or if they declined, status might be 'requested' but driver_id might be null/changed
          if (ride.status !== 'requested' && ride.driver_id === driver.id) {
            accepted = true
            break
          }
          
          if (ride.status === 'requested' && ride.driver_id !== driver.id) {
            // This driver was released or declined
            console.log(`Driver ${driver.id} declined or was released.`)
            break;
          }
        }

        if (accepted) {
          console.log(`Driver ${driver.id} accepted ride ${ride_id}`)
          dispatched = true
          break
        } else {
          // 5. Release driver and redispatch
          console.log(`Driver ${driver.id} timed out or declined. Releasing...`)
          await supabase.rpc('release_driver_and_redispatch', {
            p_ride_id: ride_id,
            p_driver_id: driver.id
          })
        }
      }
    }

    if (!dispatched) {
      console.log(`Final notify: No drivers available for ride ${ride_id}`)
      // Update ride status to reflect failure if needed, or notify rider
      // Usually the rider's frontend handles 'requested' status for a long time
      // But we can mark it cancelled if we really give up
      await supabase.from('rides')
        .update({ status: 'cancelled', cancellation_reason: 'No drivers available after search' })
        .eq('id', ride_id)
    }

    return new Response(JSON.stringify({ success: true, dispatched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in cascade-dispatch:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
