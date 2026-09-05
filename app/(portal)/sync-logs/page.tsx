"use client";

import React, { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogItem {
  id: string;
  batchId: string;
  farmerId: string;
  status: string;
  message: string | null;
  clientDeviceId: string | null;
  timestamp: string;
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-logs");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("[SyncLogs] Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans">
      <AppHeader
        title="Sync Audit Logs"
        subtitle="Detailed audit trail of synchronization batches and idempotency deduplication"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#0E121B]">
              Audit Trail & Idempotency History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect how the central server resolves offline uploads and safely suppresses duplicate requests.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="h-9 px-3 text-xs font-medium rounded-md"
          >
            Refresh Logs
          </Button>
        </div>

        <Card className="rounded-md border border-gray-200/90 shadow-none bg-white overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No sync audit events recorded yet. Register farmers and trigger sync to view audit logs.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Farmer ID</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Detail / Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isSuccess = log.status === "SUCCESS";
                    const isDup = log.status === "DUPLICATE_IGNORED";

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-slate-500">
                          {log.batchId ? log.batchId.slice(0, 16) : "—"}
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-emerald-800">
                          {log.farmerId}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={
                              isSuccess
                                ? "completed"
                                : isDup
                                ? "active"
                                : "failed"
                            }
                          />
                        </TableCell>

                        <TableCell className="text-xs text-slate-700">
                          {log.message || "Processed successfully"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
