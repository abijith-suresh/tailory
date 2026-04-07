import { type Component, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

import ResumeDocument from "@/components/resume/ResumeDocument";
import { waitForSharedPrintJob } from "@/lib/export/print-channel";
import {
  deletePrintJob,
  persistPrintJob,
  type PrintJobPayload,
  purgeExpiredPrintJobs,
  readPrintJob,
} from "@/lib/export/print-job";

const PrintRoot: Component = () => {
  const [error, setError] = createSignal("");
  const [jobId, setJobId] = createSignal("");
  const [job, setJob] = createSignal<PrintJobPayload | null>(null);
  let hasPrinted = false;

  const cleanup = () => {
    const currentJobId = jobId();
    if (currentJobId) {
      deletePrintJob(currentJobId);
    }
  };

  const loadJob = async () => {
    purgeExpiredPrintJobs();
    const params = new URLSearchParams(window.location.search);
    const nextJobId = params.get("job")?.trim() ?? "";

    if (!nextJobId) {
      setError("Print job not found.");
      return;
    }

    setJobId(nextJobId);

    const stopWaitingForChannel = waitForSharedPrintJob(nextJobId, (sharedJob) => {
      persistPrintJob(nextJobId, sharedJob);
      setJob(sharedJob);
      document.title = sharedJob.filename;
      setError("");
    });
    onCleanup(stopWaitingForChannel);

    for (let attempt = 0; attempt < 20; attempt++) {
      const nextJob = readPrintJob(nextJobId);
      if (nextJob) {
        setJob(nextJob);
        document.title = nextJob.filename;
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    setError("Print job expired or could not be loaded.");
  };

  const runPrint = async () => {
    if (hasPrinted || !job()) {
      return;
    }

    hasPrinted = true;

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } catch {
      setError("Unable to prepare this resume for printing.");
    }
  };

  onMount(() => {
    void loadJob();

    const handleAfterPrint = () => {
      cleanup();
      window.close();
    };

    window.addEventListener("afterprint", handleAfterPrint);
    onCleanup(() => {
      window.removeEventListener("afterprint", handleAfterPrint);
      cleanup();
    });
  });

  createEffect(() => {
    if (job()) {
      void runPrint();
    }
  });

  return (
    <main class="print-root min-h-screen bg-white text-gray-900">
      <Show
        when={job()}
        fallback={
          <div class="mx-auto max-w-xl px-6 py-10 text-sm text-gray-600">
            {error() || "Preparing print view..."}
          </div>
        }
      >
        {(currentJob) => (
          <div class="resume-print-shell mx-auto">
            <div
              class="resume-document__page mx-auto max-w-[680px] rounded-sm bg-white p-10 text-xs leading-relaxed shadow-lg"
              style={{ "font-family": "Helvetica, Arial, sans-serif", "min-height": "842px" }}
            >
              <ResumeDocument
                accentColor={currentJob().accentColor}
                class="resume-document--print"
                resume={currentJob().resume}
                template={currentJob().template}
              />
            </div>
          </div>
        )}
      </Show>
    </main>
  );
};

export default PrintRoot;
