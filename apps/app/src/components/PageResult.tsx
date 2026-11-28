import { Show } from "solid-js";

export type PageResultValue = { message: string; fits: boolean; pageTarget: number | null };

/**
 * The page result, such as "1 page, fits" or "about 3 lines over 1 page". Over the target reads
 * as a warning, with the words saying so, not only the colour.
 */
export function PageResult(props: {
  result: PageResultValue | null | undefined;
  fallback?: string;
}) {
  return (
    <Show
      when={props.result}
      fallback={
        <span class="page-result page-result--none">{props.fallback ?? "Nothing to print"}</span>
      }
    >
      {(result) => (
        <span class={result().fits ? "page-result" : "page-result page-result--over"}>
          {result().message}
        </span>
      )}
    </Show>
  );
}
