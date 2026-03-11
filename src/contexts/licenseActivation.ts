import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getLicenseKey, saveLicenseKey } from "@/lib/localStorage";
import { verifyLicense } from "@/lib/license";

interface LicenseActivationContextValue {
  isActivated: boolean;
  activateLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
}

const LicenseActivationContext = createContext<LicenseActivationContextValue | null>(null);

export const LicenseActivationProvider = ({ children }: { children: ReactNode }) => {
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const verifyExistingLicense = async () => {
      const licenseKey = getLicenseKey();
      const isValid = await verifyLicense(licenseKey);
      setIsActivated(isValid);
    };

    verifyExistingLicense();
  }, []);

  const activateLicense = useCallback(
    async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = licenseKey.trim();
      const isValid = await verifyLicense(trimmed);
      if (isValid) {
        saveLicenseKey(trimmed);
        setIsActivated(true);
        return {
          success: true,
        };
      }
      return {
        success: false,
        error: "Invalid license key. Make sure you copied it exactly from the claim page",
      };
    },
    []
  );

  return createElement(
    LicenseActivationContext.Provider,
    { value: { isActivated, activateLicense } },
    children
  );
};

export const useLicenseActivation = () => {
  const context = useContext(LicenseActivationContext);
  if (!context) {
    throw new Error("useLicenseActivation must be used within a LicenseActivationProvider");
  }
  return context;
};
