import { ConstellationConsole } from "./field-console/constellation-console";
import { OrbitConsole } from "./field-console/orbit-console";

/** Which empty-field staging to show. Two metaphors, same affordance + copy. */
export type FieldConsoleVariant = "constellation" | "orbit";

interface FieldConsoleProps {
  /** Greeting line, already time-resolved by the parent (keeps this pure). */
  greeting: string;
  /** Pick the metaphor. Defaults to constellation. */
  variant?: FieldConsoleVariant;
}

/**
 * The empty-field state — the brand's first statement when the board is clear.
 *
 * Rather than three grey "·0" placeholders, it shows the latent structure of the
 * field and invites the first capture, with each entry type one tap into a
 * pre-typed capture so the first thing logged teaches the five-type model.
 *
 * Two metaphors are wired up so they can be compared live, then one chosen:
 *   · constellation — the whole-field dot cluster, scattering into five lanes.
 *   · orbit         — the five types circling a central capture core (SVG).
 *
 * Switch by passing `variant` from the home screen.
 */
export function FieldConsole({
  greeting,
  variant = "constellation",
}: FieldConsoleProps): React.ReactElement {
  return variant === "orbit" ? (
    <OrbitConsole greeting={greeting} />
  ) : (
    <ConstellationConsole greeting={greeting} />
  );
}
