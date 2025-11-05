'use client';

import * as React from 'react';
import clsx from 'clsx';

type DivProps = React.ComponentPropsWithoutRef<'div'>;
type HeadingProps = React.ComponentPropsWithoutRef<'h3'>;
type ParagraphProps = React.ComponentPropsWithoutRef<'p'>;

export function Card({ className, children, ...props }: React.PropsWithChildren<DivProps>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.PropsWithChildren<DivProps>) {
  return (
    <div className={clsx('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.PropsWithChildren<HeadingProps>) {
  return (
    <h3
      className={clsx('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.PropsWithChildren<ParagraphProps>) {
  return (
    <p className={clsx('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.PropsWithChildren<DivProps>) {
  return (
    <div className={clsx('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.PropsWithChildren<DivProps>) {
  return (
    <div className={clsx('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
