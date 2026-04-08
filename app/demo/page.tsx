'use client';

import { DemoPageTemplate } from '@/components/demo/DemoPageTemplate';
import { PIANO_DEMO } from '@/lib/demo/sampleData';

export default function DemoPage() {
  return <DemoPageTemplate demoScript={PIANO_DEMO} currentDemoId="1" />;
}
