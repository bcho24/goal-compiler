'use client';

import { DemoPageTemplate } from '@/components/demo/DemoPageTemplate';
import { INVESTING_DEMO } from '@/lib/demo/sampleData';

export default function InvestingDemoPage() {
  return <DemoPageTemplate demoScript={INVESTING_DEMO} currentDemoId="2" />;
}
