export const isValidHostname = (hostname: string): boolean => {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  // IPv6 address (enclosed in brackets or raw)
  const ipv6Regex = /^(\[)?[a-fA-F0-9:]+(\])?$/;
  if (ipv6Regex.test(hostname)) {
    return true;
  }

  // IPv4 address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }

  // RFC 1123 hostname: alphanumeric, hyphens, and dots only
  const hostnameRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
};
