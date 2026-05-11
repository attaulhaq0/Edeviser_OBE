import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  useAccessibilityPreferences,
  useUpdateAccessibilityPreferences,
} from "@/hooks/useAccessibilityPreferences";

interface FocusModeContextValue {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextValue>({
  isFocusMode: false,
  toggleFocusMode: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useFocusMode = () => useContext(FocusModeContext);

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
  const { data: prefs } = useAccessibilityPreferences();
  const updatePrefs = useUpdateAccessibilityPreferences();
  const [localFocusMode, setLocalFocusMode] = useState(false);

  const isFocusMode = prefs?.simplified_view ?? localFocusMode;

  const toggleFocusMode = useCallback(() => {
    const newValue = !isFocusMode;
    setLocalFocusMode(newValue);
    if (prefs) {
      updatePrefs.mutate({ ...prefs, simplified_view: newValue });
    }
  }, [isFocusMode, prefs, updatePrefs]);

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
};
