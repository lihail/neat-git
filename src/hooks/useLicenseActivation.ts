import { useEffect, useState } from "react";
import { getLicenseKey, saveLicenseKey } from "@/lib/localStorage";
import { verifyLicense } from "@/lib/license";

export const useLicenseActivation = () => {
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const verifyExistingLicense = async () => {
      const licenseKey = getLicenseKey();
      const isValid = await verifyLicense(licenseKey);
      if (isValid) {
        setIsActivated(true);
      }
    };
    verifyExistingLicense();
  }, []);

  const activateLicense = async (
    licenseKey: string
  ): Promise<{ success: boolean; error?: string }> => {
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
  };

  return {
    isActivated,
    activateLicense,
  };
};
