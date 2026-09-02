import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "@/store";

/** Typed dispatch for the app store. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** Typed selector hook for the app store. */
export const useAppSelector = useSelector.withTypes<RootState>();