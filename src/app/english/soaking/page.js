import prisma from "@/lib/prisma";
import SoakingClient from "./SoakingClient";

export const metadata = {
  title: "Brain Soaking Playlist | English Vault",
};

export default function SoakingPage() {
  return <SoakingClient />;
}
