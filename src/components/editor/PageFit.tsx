import { Match, Show, Switch } from "solid-js";
import { iconButton, inlineAction } from "@/components/ui/buttons";
import { Close, Minus, Plus } from "@/components/ui/icons";
import type { FitResult } from "@/lib/fit/fit";
import { setShownAutoFit, setShownPageTarget, shownFit, shownPageFit } from "@/store/fit";

export const pages = (count: number) => (count === 1 ? "1 page" : `${count} pages`);

const lines = (count: number) => (count === 1 ? "1 line" : `${count} lines`);

const stepButton = `${iconButton} md:size-8 disabled:bg-transparent`;

/** An action inside the notice, with a 44px hit area on phones. */
const noticeAction = `${inlineAction} -my-3 inline-flex min-h-11 items-center md:my-0 md:min-h-0`;

/**
 * Pages and whether they meet the target, as "1 page · fits". A resume tightened to fit reads as
 * fitting; the notice under the target says it was tightened.
 */
export function fitReadout(fit: FitResult | undefined): string {
  if (!fit) return "";
  const count = pages(fit.pageCount);
  if (fit.status === "none") return count;
  return `${count} · ${fit.status === "over" ? "over" : "fits"}`;
}

/** The readout, coloured by how it fits. */
export function FitReadout(props: { class?: string; testId?: string }) {
  return (
    <p
      data-testid={props.testId}
      class={`font-mono text-ui-xs ${props.class ?? ""}`}
      classList={{
        "text-keep": shownFit()?.status === "fits" || shownFit()?.status === "tightened",
        "text-danger": shownFit()?.status === "over",
        "text-fg-muted": shownFit()?.status === "none",
      }}
    >
      {fitReadout(shownFit())}
    </p>
  );
}

/**
 * The page target of the open tab and how the resume fits it. The target is the only control:
 * Tailory tightens on its own to meet it, says so, and offers to undo that.
 */
export default function PageFit() {
  const target = () => shownPageFit().pageTarget;
  let morePages: HTMLButtonElement | undefined;

  const fewer = (count: number) => {
    setShownPageTarget(count - 1);
    // The button disables at one page; keep focus in the stepper rather than lose it.
    if (count - 1 <= 1) morePages?.focus();
  };

  return (
    <div>
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="flex items-center gap-2">
          <span id="page-target-label" class="text-ui-xs text-fg-muted">
            Target
          </span>
          <Show
            when={target()}
            fallback={
              <button
                type="button"
                class={noticeAction}
                disabled={!shownFit()}
                onClick={() => setShownPageTarget(shownFit()?.pageCount ?? null)}
              >
                Set a page target
              </button>
            }
          >
            {(count) => (
              <>
                <div
                  role="group"
                  aria-labelledby="page-target-label"
                  class="flex items-center rounded-button ring-1 ring-line-strong ring-inset"
                >
                  <button
                    type="button"
                    class={stepButton}
                    aria-label="One page fewer"
                    disabled={count() <= 1}
                    onClick={() => fewer(count())}
                  >
                    <Minus />
                  </button>
                  <output class="min-w-6 text-center font-mono text-ui-sm" aria-live="polite">
                    {count()}
                    <span class="sr-only"> {count() === 1 ? "page" : "pages"}</span>
                  </output>
                  <button
                    ref={morePages}
                    type="button"
                    class={stepButton}
                    aria-label="One page more"
                    onClick={() => setShownPageTarget(count() + 1)}
                  >
                    <Plus />
                  </button>
                </div>
                <button
                  type="button"
                  class={stepButton}
                  aria-label="Clear the page target"
                  title="Clear target"
                  onClick={() => setShownPageTarget(null)}
                >
                  <Close />
                </button>
              </>
            )}
          </Show>
        </div>
        <FitReadout testId="page-fit-readout" />
      </div>
      <p role="status" class="text-body-sm text-fg-muted empty:hidden">
        <Show when={shownFit()}>
          {(result) => (
            <Switch>
              <Match when={result().status === "tightened" && result().pageTarget}>
                {(goal) => (
                  <span class="mt-2 block">
                    Tightened to fit {pages(goal())} ·{" "}
                    <button
                      type="button"
                      class={noticeAction}
                      onClick={() => setShownAutoFit(false)}
                    >
                      Undo
                    </button>
                  </span>
                )}
              </Match>
              <Match when={result().status === "over" && result().pageTarget}>
                {(goal) => (
                  <span class="mt-2 block">
                    About {lines(result().linesOver)} over {pages(goal())}
                    <Show
                      when={shownPageFit().autoFit}
                      fallback={
                        <>
                          {" · "}
                          <button
                            type="button"
                            class={noticeAction}
                            onClick={() => setShownAutoFit(true)}
                          >
                            Tighten
                          </button>
                        </>
                      }
                    >
                      {", even tightened · "}
                      <button
                        type="button"
                        class={noticeAction}
                        onClick={() => setShownAutoFit(false)}
                      >
                        Undo
                      </button>
                    </Show>
                  </span>
                )}
              </Match>
            </Switch>
          )}
        </Show>
      </p>
    </div>
  );
}
