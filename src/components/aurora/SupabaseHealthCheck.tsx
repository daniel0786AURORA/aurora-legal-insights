import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function SupabaseHealthCheck() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase
          .from("calendar_events")
          .select("*", { count: "exact", head: true });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
        } else {
          setStatus("ok");
        }
      } catch (err: unknown) {
        setStatus("error");
        setErrorMsg((err as Error).message || "Erro desconhecido");
      }
    }
    checkConnection();
  }, []);

  if (status === "loading") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs shadow-lg">
      {status === "ok" ? (
        <>
          <span className="flex size-2 rounded-full bg-teal"></span>
          <span className="font-medium text-foreground">DB OK</span>
        </>
      ) : (
        <>
          <span className="flex size-2 rounded-full bg-destructive"></span>
          <span className="font-medium text-destructive">DB OFFLINE: {errorMsg}</span>
        </>
      )}
    </div>
  );
}
