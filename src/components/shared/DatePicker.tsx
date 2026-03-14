"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  className,
  onChange,
  value,
  bordered = true,
}: {
  className?: string;
  onChange?: (date: Date | undefined) => void;
  value?: Date | string;
  bordered?: boolean;
}) {
  const initialDate = typeof value === "string" ? new Date(value) : value;
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    initialDate
  );
  const [tempDate, setTempDate] = React.useState<Date | undefined>(initialDate);
  const [open, setOpen] = React.useState(false);

  // Keep internal state in sync when external value changes
  React.useEffect(() => {
    const parsed = typeof value === "string" ? new Date(value) : value;
    setSelectedDate(parsed);
    setTempDate(parsed);
  }, [value]);

  const applyDate = () => {
    setSelectedDate(tempDate);
    setOpen(false);
    onChange?.(tempDate);
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setTempDate(undefined);
    setOpen(false);
    onChange?.(undefined);
  };

  const cancel = () => {
    setTempDate(selectedDate); // reset to last confirmed
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start text-left font-normal py-3",
            !selectedDate && "text-muted-foreground",
            !bordered && "border-none bg-inherit w-fit",
            className
          )}
        >
          {bordered && <CalendarIcon className=" h-4 w-4" />}
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span>Select date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 space-y-2" align="end">
        <Calendar mode="single" selected={tempDate} onSelect={setTempDate} />
        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="ghost" onClick={clearDate} size="sm">
            Clear
          </Button>
          <Button variant="ghost" onClick={cancel} size="sm">
            Cancel
          </Button>
          <Button onClick={applyDate} size="sm" className="text-black">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
