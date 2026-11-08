import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 bg-sidebar lg:block" />
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
