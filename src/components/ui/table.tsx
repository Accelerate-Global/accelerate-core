import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Table = ({ className, ...props }: ComponentProps<"table">) => {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
};

const TableHeader = ({ className, ...props }: ComponentProps<"thead">) => {
  return (
    <thead
      className={cn("[&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
};

const TableBody = ({ className, ...props }: ComponentProps<"tbody">) => {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
};

const TableFooter = ({ className, ...props }: ComponentProps<"tfoot">) => {
  return (
    <tfoot
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      data-slot="table-footer"
      {...props}
    />
  );
};

const TableRow = ({ className, ...props }: ComponentProps<"tr">) => {
  return (
    <tr
      className={cn(
        "border-b transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
        className
      )}
      data-slot="table-row"
      {...props}
    />
  );
};

const TableHead = ({ className, ...props }: ComponentProps<"th">) => {
  return (
    <th
      className={cn(
        "h-11 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
};

const TableCell = ({ className, ...props }: ComponentProps<"td">) => {
  return (
    <td
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
};

const TableCaption = ({ className, ...props }: ComponentProps<"caption">) => {
  return (
    <caption
      className={cn("mt-4 text-muted-foreground text-sm", className)}
      data-slot="table-caption"
      {...props}
    />
  );
};

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
