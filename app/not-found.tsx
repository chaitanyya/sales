import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconSearch } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="text-center max-w-md px-4">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <IconSearch className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
