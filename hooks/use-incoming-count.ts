import { useAppSelector } from "@/store/hooks";
import { selectIncomingCount } from "@/store/selectors/incoming";

/**
 * Count of approaching, still-open temporal entries (deadlines, events, todos)
 * due or scheduled within the current week. Reads straight off the entries
 * slice, so this hook re-renders only when entries change — never on projects,
 * tasks, or diary updates. Returns 0 when clear.
 */
export function useIncomingCount(): number {
  return useAppSelector((state) => selectIncomingCount(state, new Date()));
}