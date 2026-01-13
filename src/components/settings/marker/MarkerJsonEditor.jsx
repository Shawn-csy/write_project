import React from "react";

export function MarkerJsonEditor({ localConfigs, setLocalConfigs }) {
    return (
        <textarea 
          className="w-full h-96 p-4 font-mono text-xs bg-muted/30 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
          defaultValue={JSON.stringify(localConfigs, null, 2)}
          onChange={(e) => {
              try {
                  setLocalConfigs(JSON.parse(e.target.value));
              } catch(err) {}
          }}
        />
    );
}
