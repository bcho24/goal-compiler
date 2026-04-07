'use client';

import Link from 'next/link';
import { Settings, Target, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n, LOCALE_OPTIONS, getLocaleLabel, type Locale } from '@/lib/i18n';

export function Header() {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Target className="h-5 w-5 text-primary" />
          <span>{t('common.appName')}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger
              size="sm"
              className="group h-8 w-fit max-w-full gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-sm shadow-none ring-0 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 data-placeholder:text-muted-foreground dark:hover:bg-accent/40"
              aria-label={t('common.language')}
            >
              <Globe
                className="size-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-90 group-data-[popup-open]:opacity-90"
                aria-hidden
              />
              <SelectValue className="flex-none text-left font-normal text-foreground/90">
                {getLocaleLabel(locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              sideOffset={6}
              alignItemWithTrigger={false}
              className="w-56 min-w-56 max-w-56 rounded-xl border-0 p-1 shadow-md ring-1 ring-border/60 dark:ring-border/40"
            >
              {LOCALE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="rounded-lg py-2 pr-8 pl-2 text-[13px] leading-snug"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
