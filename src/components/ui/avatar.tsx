"use client";

import {
  Fallback as AvatarFallbackPrimitive,
  Image as AvatarImagePrimitive,
  Root as AvatarRoot,
} from "@radix-ui/react-avatar";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Avatar = ({ className, ...props }: ComponentProps<typeof AvatarRoot>) => (
  <AvatarRoot
    className={cn(
      "relative flex size-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    data-slot="avatar"
    {...props}
  />
);

const AvatarImage = ({
  className,
  ...props
}: ComponentProps<typeof AvatarImagePrimitive>) => (
  <AvatarImagePrimitive
    className={cn("aspect-square size-full", className)}
    data-slot="avatar-image"
    {...props}
  />
);

const AvatarFallback = ({
  className,
  ...props
}: ComponentProps<typeof AvatarFallbackPrimitive>) => (
  <AvatarFallbackPrimitive
    className={cn(
      "flex size-full items-center justify-center rounded-full bg-muted",
      className
    )}
    data-slot="avatar-fallback"
    {...props}
  />
);

export { Avatar, AvatarFallback, AvatarImage };
