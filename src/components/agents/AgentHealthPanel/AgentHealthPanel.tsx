
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Assuming supabase-js is installed

// Supabase client configuration
// TODO: Replace with actual Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AgentHealth {
  id: string;
  agent_name: string;
  current_task: string;
  last_seen: string; // ISO string e.g. "2024-06-17T15:12:51.297485+00:00"
  status: 'idle' | 'working' | 'error'; // operational status from the database
  // Add other health indicators as per PRD
}

type HealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Derives a connectivity health status from the last_seen timestamp.
 *  - healthy  : last_seen < 15 minutes ago
 *  - warning  : last_seen between 15 and 60 minutes ago
 *  - critical : last_seen > 60 minutes ago
 */
function getHealthStatus(lastSeen: string): HealthStatus {
  const lastSeenMs = new Date(lastSeen).getTime();
  const nowMs = Date.now();
  const diffMinutes = (nowMs - lastSeenMs) / 1000 / 60;

  if (diffMinutes < 15) return 'healthy';
  if (diffMinutes < 60) return 'warning';
  return 'critical';
}

export const AgentHealthPanel: React.FC = () => {
  const [agentHealth, setAgentHealth] = useState<AgentHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch of data
    const fetchInitialData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_health')
        .select('*');

      if (error) {
        console.error('Error fetching initial agent health:', error);
        setError(error.message);
      } else {
        setAgentHealth(data || []);
      }
      setLoading(false);
    };

    fetchInitialData();

    // Set up Realtime subscription
    const channel = supabase
      .channel('agent_health_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_health' },
        (payload) => {
          console.log('Change received!', payload);
          // Depending on the event type (INSERT, UPDATE, DELETE), update the state
          if (payload.eventType === 'INSERT') {
            setAgentHealth((prev) => [...prev, payload.new as AgentHealth]);
          } else if (payload.eventType === 'UPDATE') {
            setAgentHealth((prev) =>
              prev.map((agent) =>
                agent.id === (payload.new as AgentHealth).id ? (payload.new as AgentHealth) : agent
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAgentHealth((prev) =>
              prev.filter((agent) => agent.id !== (payload.old as AgentHealth).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div>Loading agent health...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="agent-health-panel p-4">
      <h2 className="text-xl font-bold mb-4">Agent Health Status</h2>
      {agentHealth.length === 0 ? (
        <p>No agent health data available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentHealth.map((agent) => (
            <div key={agent.id} className="bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold">{agent.agent_name}</h3>
              <p>Task: {agent.current_task}</p>
              <p>Last Seen: {new Date(agent.last_seen).toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    getHealthStatus(agent.last_seen) === 'healthy' ? 'bg-green-500' :
                    getHealthStatus(agent.last_seen) === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                ></span>
                <span>Status: {agent.status}</span>
              </div>
              {/* Add more health indicators here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


