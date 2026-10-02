import { MapperApp } from "@/components/mapper/mapper-app";
import { MapperProvider } from "@/lib/state/mapper-store";

export default function Home() {
  return (
    <MapperProvider>
      <MapperApp />
    </MapperProvider>
  );
}
