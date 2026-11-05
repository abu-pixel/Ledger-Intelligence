import { Redirect } from "expo-router";
import { useIdentitySession } from "@/contexts/IdentitySessionContext";

export default function IndexScreen() {
  const { identityUser, ready, recovery } = useIdentitySession();
  if (!ready) return null;

  return <Redirect href={identityUser && !recovery ? "/(tabs)" : "/(auth)/sign-in"} />;
}
