import type { DemoScript } from './types';

export interface DemoMeta {
  id: string;
  href: string;
  emoji: string;
  label: string;
  script: DemoScript;
}

export const INVESTING_DEMO: DemoScript = {
  initialGoalText: 'Build investing and portfolio management skills',
  refinedGoalText:
    'Build investing and portfolio management skills across bonds, fixed income, stocks, index funds, and ETFs with $10,000 initial capital plus $5,000 monthly contributions to achieve free cash flow covering daily expenses as quickly as possible.',
  clarificationRounds: [
    {
      questions: [
        {
          question: 'Which specific areas of financial skills do you want to focus on?',
          type: 'text',
          answer: 'Investing and portfolio management',
        },
        {
          question: "What's your current experience level with finances?",
          type: 'text',
          answer: 'Some basic knowledge',
        },
        {
          question: 'What does success look like for you? What outcome are you aiming for?',
          type: 'text',
          answer: 'Achieving free cash flow can cover daily expenses',
        },
        {
          question:
            "What's your target timeline for achieving free cash flow that covers your daily expenses?",
          type: 'text',
          answer: 'As soon as possible',
        },
        {
          question: 'How much capital do you currently have available to invest?',
          type: 'text',
          answer: '$10,000 initial + $5,000/month contributions',
        },
        {
          question: 'Which investment types are you most interested in learning about?',
          type: 'select',
          options: [
            'Bonds and fixed income',
            'Stock market and individual stocks',
            'Index funds and ETFs',
            'Real estate',
          ],
          answer: 'Bonds and fixed income, stocks, and index funds/ETFs',
        },
      ],
    },
  ],
  feasibility: {
    summary:
      'The goal is feasible but requires realistic expectations about timeline. Generating daily expense coverage through investment returns on $10k initial plus $5k/month contributions typically takes 3-7 years depending on expense level, market returns, and asset allocation. Success depends heavily on consistent contributions, disciplined portfolio management, and market conditions.',
    level: 'medium',
    assumptions: [
      'Daily expenses are modest enough to be covered by investment returns (likely $1,000-$3,000/month based on typical 4-6% withdrawal rates)',
      'Ability to maintain $5,000 monthly contributions consistently through market downturns',
      'Access to low-cost investment vehicles (index funds, ETFs) with minimal fees',
      'Willingness to learn portfolio rebalancing and risk management principles',
      'Market conditions remain reasonably normal (no prolonged bear markets or economic collapse)',
      'No major unexpected expenses will force early portfolio withdrawals',
      'Current basic financial knowledge can be built upon through self-study or courses',
    ],
    risks: [
      'Timeline expectations may be unrealistic—reaching $500k-$1M portfolio (needed for $20k-$40k annual expenses) takes 5-10+ years',
      'Market volatility could trigger emotional decisions leading to buy-high/sell-low behavior',
      'Insufficient diversification or poor asset allocation could underperform market averages',
      'Inflation erodes purchasing power—returns must outpace inflation to maintain real income',
      'Concentration risk if focusing too heavily on individual stocks rather than diversified funds',
      'Sequence of returns risk—poor market performance early in accumulation phase delays goals significantly',
      'Lack of professional guidance could lead to costly mistakes in tax optimization or rebalancing',
      'Life circumstances (job loss, health issues) could interrupt contribution discipline',
    ],
  },
  plan: {
    groups: [
      {
        ref: 'G1',
        title: 'Build Financial Foundation & Knowledge',
        description:
          'Establish baseline understanding of investing concepts, assess current financial situation, and set up necessary accounts and tools.',
        blocked_by: [],
      },
      {
        ref: 'G2',
        title: 'Develop Portfolio Strategy & Asset Allocation',
        description:
          'Research investment vehicles, determine appropriate asset allocation based on risk tolerance and timeline, and create a rebalancing plan.',
        blocked_by: ['G1'],
      },
      {
        ref: 'G3',
        title: 'Deploy Initial Capital & Establish Contribution System',
        description:
          'Execute initial $10,000 investment according to strategy, automate $5,000 monthly contributions, and set up tracking systems.',
        blocked_by: ['G2'],
      },
      {
        ref: 'G4',
        title: 'Execute Ongoing Portfolio Management & Monitoring',
        description:
          'Monitor portfolio performance, rebalance periodically, track progress toward free cash flow goal, and adjust strategy as needed.',
        blocked_by: ['G3'],
      },
    ],
    steps: [
      {
        ref: 'S1',
        title: 'Assess current financial situation and daily expense baseline',
        description:
          'Calculate monthly and annual daily expenses to determine the free cash flow target needed. Document current income, existing savings, debt, and emergency fund status.',
        type: 'decision',
        executable: false,
        blocked_by: [],
        group: 'G1',
        reason_if_not_executable:
          'Requires personal financial data and judgment about expense levels.',
      },
      {
        ref: 'S2',
        title: 'Learn core investing concepts and terminology',
        description:
          'Study fundamental concepts: bonds vs. stocks, fixed income mechanics, index funds vs. individual stocks, ETF structure, diversification, risk tolerance, and the 4% rule for sustainable withdrawals.',
        type: 'research',
        executable: true,
        blocked_by: [],
        group: 'G1',
        tool_hint: 'web_search',
      },
      {
        ref: 'S3',
        title: 'Research low-cost investment platforms and account types',
        description:
          'Identify brokers offering low-fee index funds and ETFs (e.g., Vanguard, Fidelity, Schwab). Compare account types: taxable brokerage, IRA, 401(k) if available.',
        type: 'research',
        executable: true,
        blocked_by: ['S2'],
        group: 'G1',
        tool_hint: 'web_search',
      },
      {
        ref: 'S4',
        title: 'Open investment accounts and complete setup',
        description:
          'Open brokerage account(s) based on research. Complete identity verification, fund initial account, and set up automatic monthly contribution transfers.',
        type: 'action',
        executable: false,
        blocked_by: ['S3'],
        group: 'G1',
        reason_if_not_executable: 'Requires personal account creation and banking setup.',
      },
      {
        ref: 'S5',
        title: 'Determine personal risk tolerance and investment timeline',
        description:
          'Assess risk tolerance through questionnaire or self-reflection. Consider timeline to free cash flow goal (3-7 years estimated). Document comfort level with market volatility.',
        type: 'decision',
        executable: false,
        blocked_by: [],
        group: 'G2',
        reason_if_not_executable:
          'Requires personal judgment about risk tolerance and financial goals.',
      },
      {
        ref: 'S6',
        title: 'Research and compare asset allocation models',
        description:
          'Study common allocation strategies: age-based (e.g., 60/40 stocks/bonds), target-date funds, three-fund portfolio, and bond ladder approaches.',
        type: 'research',
        executable: true,
        blocked_by: ['S5'],
        group: 'G2',
        tool_hint: 'web_search',
      },
      {
        ref: 'S7',
        title: 'Select specific investment vehicles (index funds, ETFs, bonds)',
        description:
          'Choose specific low-cost funds across asset classes: broad stock index funds (e.g., VTI, VTSAX), international exposure (e.g., VXUS), bond funds (e.g., BND, VBTLX).',
        type: 'decision',
        executable: false,
        blocked_by: ['S6'],
        group: 'G2',
        reason_if_not_executable: 'Requires personal selection based on research and risk tolerance.',
      },
      {
        ref: 'S8',
        title: 'Create detailed portfolio allocation plan',
        description:
          'Document target allocation percentages for each investment vehicle. Create rebalancing schedule (quarterly, semi-annual, or annual). Define triggers for rebalancing.',
        type: 'creation',
        executable: false,
        blocked_by: ['S7'],
        group: 'G2',
        reason_if_not_executable:
          'Requires personal decision-making on allocation and rebalancing strategy.',
      },
      {
        ref: 'S9',
        title: 'Deploy initial $10,000 capital according to allocation plan',
        description:
          'Execute initial investment of $10,000 across selected funds in target allocation percentages. Document purchase prices, dates, and quantities for tax tracking.',
        type: 'action',
        executable: false,
        blocked_by: ['S4', 'S8'],
        group: 'G3',
        reason_if_not_executable: 'Requires personal execution of investment transactions.',
      },
      {
        ref: 'S10',
        title: 'Set up automated monthly $5,000 contributions',
        description:
          'Configure automatic transfers of $5,000/month from bank account to investment account. Set up automatic investment into target allocation. Verify first contribution processes successfully.',
        type: 'action',
        executable: false,
        blocked_by: ['S9'],
        group: 'G3',
        reason_if_not_executable: 'Requires personal setup of banking automation.',
      },
      {
        ref: 'S11',
        title: 'Create portfolio tracking and monitoring system',
        description:
          'Set up spreadsheet or tool to track: monthly contributions, portfolio value, asset allocation drift, investment returns, and progress toward free cash flow goal.',
        type: 'creation',
        executable: true,
        blocked_by: ['S10'],
        group: 'G3',
        tool_hint: 'code_generation',
      },
      {
        ref: 'S12',
        title: 'Monitor portfolio performance monthly',
        description:
          'Review portfolio value, contribution status, and allocation percentages monthly. Compare actual returns against projections. Update tracking system with latest data.',
        type: 'action',
        executable: false,
        blocked_by: ['S11'],
        group: 'G4',
        reason_if_not_executable: 'Requires ongoing personal monitoring and data entry.',
      },
      {
        ref: 'S13',
        title: 'Execute quarterly or semi-annual rebalancing',
        description:
          'Review portfolio allocation against target percentages. Rebalance when drift exceeds defined threshold (typically 5%). Use new monthly contributions to rebalance when possible.',
        type: 'action',
        executable: false,
        blocked_by: ['S12'],
        group: 'G4',
        reason_if_not_executable:
          'Requires personal judgment on rebalancing timing and execution.',
      },
      {
        ref: 'S14',
        title: 'Track progress toward free cash flow milestone',
        description:
          'Calculate portfolio value needed to generate target daily expense coverage at 4% withdrawal rate. Track monthly progress and estimated time to reach goal.',
        type: 'action',
        executable: true,
        blocked_by: ['S12'],
        group: 'G4',
        tool_hint: 'code_generation',
      },
      {
        ref: 'S15',
        title: 'Review and adjust strategy annually',
        description:
          'Conduct annual portfolio review: assess actual vs. projected returns, evaluate if asset allocation still matches risk tolerance, review fee structure, and adjust if life circumstances change.',
        type: 'decision',
        executable: false,
        blocked_by: ['S13'],
        group: 'G4',
        reason_if_not_executable: 'Requires personal judgment on strategy adjustments.',
      },
      {
        ref: 'S16',
        title: 'Plan transition to sustainable withdrawal strategy',
        description:
          'As portfolio approaches free cash flow goal, research withdrawal strategies: 4% rule, dynamic withdrawal, bucket strategy. Plan tax-efficient withdrawal sequencing.',
        type: 'research',
        executable: true,
        blocked_by: ['S14'],
        group: 'G4',
        tool_hint: 'web_search',
      },
    ],
  },
};

export const PIANO_DEMO: DemoScript = {
  initialGoalText: 'Learn piano as a personal hobby for enjoyment',
  refinedGoalText:
    'Learn piano as a personal hobby for enjoyment, using an existing piano/keyboard, with no specific timeline or proficiency target.',
  clarificationRounds: [
    {
      questions: [
        {
          question:
            'What is your timeline for learning piano? Are you looking to start soon, and do you have a target proficiency level or timeframe in mind?',
          type: 'text',
          answer: 'no time limit',
        },
        {
          question:
            'Do you already have access to a piano or keyboard, or is acquiring an instrument part of your goal?',
          type: 'select',
          options: [
            'Yes, I have a piano/keyboard',
            'No, I need to acquire one',
            'I have access to one but it is not mine',
          ],
          answer: 'Yes, I have a piano/keyboard',
        },
        {
          question: 'What is your main motivation for learning piano?',
          type: 'select',
          options: [
            'Personal enjoyment/hobby',
            'Professional development',
            'Performing for others',
            'Music composition',
          ],
          answer: 'Personal enjoyment/hobby',
        },
      ],
    },
  ],
  feasibility: {
    summary:
      'This goal is highly feasible given the minimal constraints and existing resources. Learning piano as a hobby without timeline or proficiency targets removes significant pressure and allows for flexible, sustainable progress driven purely by personal enjoyment.',
    level: 'high',
    assumptions: [
      'You have regular access to the piano/keyboard and a suitable space to practice',
      'You can dedicate at least occasional time to practice (even 15-30 minutes weekly)',
      'You have basic motivation to engage with the instrument consistently over time',
      'The piano/keyboard is in functional working condition',
      'You have access to learning resources (online tutorials, apps, books, or lessons) at minimal or no cost',
    ],
    risks: [
      'Initial learning curve may feel frustrating without clear milestones, potentially leading to abandonment',
      'Lack of structure or accountability could result in inconsistent practice and slow progress',
      'Without guidance, you may develop poor technique or bad habits that are difficult to correct later',
      'Motivation may wane over time if progress feels stagnant or unclear',
      'Life circumstances (time constraints, competing priorities) could interrupt consistency',
    ],
  },
  plan: {
    groups: [
      {
        ref: 'G1',
        title: 'Setup and Preparation',
        description:
          'Establish your learning foundation by assessing your instrument and creating a suitable practice environment.',
        blocked_by: [],
      },
      {
        ref: 'G2',
        title: 'Resource Selection',
        description:
          'Identify and gather learning materials that align with your hobby-focused, self-paced approach.',
        blocked_by: ['G1'],
      },
      {
        ref: 'G3',
        title: 'Foundational Learning',
        description:
          'Build core knowledge of music theory, hand positioning, and basic technique.',
        blocked_by: ['G2'],
      },
      {
        ref: 'G4',
        title: 'Ongoing Practice and Enjoyment',
        description:
          'Develop a sustainable practice routine and explore music that brings you joy.',
        blocked_by: ['G3'],
      },
    ],
    steps: [
      {
        ref: 'S1',
        title: 'Assess your piano/keyboard condition and setup',
        description:
          'Check that your instrument is in working order (all keys functional, proper sound output). Set up the piano/keyboard in a comfortable, quiet space where you can practice regularly.',
        type: 'action',
        executable: false,
        blocked_by: [],
        group: 'G1',
        reason_if_not_executable:
          'Requires human judgment to evaluate instrument condition and determine suitable practice space.',
      },
      {
        ref: 'S2',
        title: 'Establish a basic practice routine',
        description:
          'Decide on a realistic practice schedule (e.g., 2-3 times per week, 20-30 minutes per session). This flexibility supports hobby-focused learning without pressure.',
        type: 'decision',
        executable: false,
        blocked_by: [],
        group: 'G1',
        reason_if_not_executable:
          'Requires human judgment to determine personal availability and commitment level.',
      },
      {
        ref: 'S3',
        title: 'Research free or low-cost learning resources',
        description:
          'Identify available learning materials: online platforms (YouTube tutorials, Coursera, Udemy free trials), piano learning apps (Simply Piano, Flowkey, Synthesia), free sheet music sites, or beginner piano books.',
        type: 'research',
        executable: true,
        blocked_by: [],
        group: 'G2',
        tool_hint: 'web_search',
      },
      {
        ref: 'S4',
        title: 'Select primary learning resource(s)',
        description:
          'Choose 1-2 resources that match your learning style (visual, interactive, structured, or exploratory). Examples: a beginner YouTube series, an app with interactive lessons, or a beginner piano book.',
        type: 'decision',
        executable: false,
        blocked_by: ['S3'],
        group: 'G2',
        reason_if_not_executable:
          'Requires human judgment to evaluate which resource aligns with personal learning preferences and goals.',
      },
      {
        ref: 'S5',
        title: 'Learn music notation and basic theory',
        description:
          'Study the musical staff, note names, rhythm, and basic time signatures. Focus on understanding how to read sheet music at a beginner level.',
        type: 'action',
        executable: false,
        blocked_by: ['S4'],
        group: 'G3',
        reason_if_not_executable:
          'Requires human engagement with learning materials and practice to internalize concepts.',
      },
      {
        ref: 'S6',
        title: 'Learn proper hand positioning and posture',
        description:
          'Study correct hand placement on the keyboard, finger numbering, wrist alignment, and seated posture. Proper technique prevents injury and supports long-term enjoyment.',
        type: 'action',
        executable: false,
        blocked_by: ['S4'],
        group: 'G3',
        reason_if_not_executable:
          'Requires human practice and self-assessment of physical positioning.',
      },
      {
        ref: 'S7',
        title: 'Practice basic finger exercises and scales',
        description:
          'Work through beginner finger exercises (e.g., Hanon exercises, simple scales, arpeggios) to build muscle memory, dexterity, and familiarity with the keyboard layout.',
        type: 'action',
        executable: false,
        blocked_by: ['S5', 'S6'],
        group: 'G3',
        reason_if_not_executable:
          'Requires hands-on practice at the instrument over multiple sessions.',
      },
      {
        ref: 'S8',
        title: 'Learn and play your first simple melodies',
        description:
          "Begin with beginner-level pieces or folk songs (e.g., 'Twinkle Twinkle Little Star', 'Mary Had a Little Lamb'). Focus on enjoyment and building confidence rather than perfection.",
        type: 'action',
        executable: false,
        blocked_by: ['S7'],
        group: 'G4',
        reason_if_not_executable:
          'Requires hands-on practice and personal judgment about when readiness is achieved.',
      },
      {
        ref: 'S9',
        title: 'Gradually expand repertoire based on personal interest',
        description:
          'Explore pieces and genres that bring you joy (classical, pop, jazz, etc.). Progress at your own pace without external pressure. Seek out sheet music or tutorials for songs you enjoy.',
        type: 'action',
        executable: false,
        blocked_by: ['S8'],
        group: 'G4',
        reason_if_not_executable:
          'Requires human judgment about musical preferences and self-directed exploration.',
      },
      {
        ref: 'S10',
        title: 'Maintain consistent practice and reflect on enjoyment',
        description:
          'Continue regular practice sessions, tracking progress informally. Periodically reflect on what aspects of piano bring you the most joy and adjust your focus accordingly.',
        type: 'action',
        executable: false,
        blocked_by: ['S9'],
        group: 'G4',
        reason_if_not_executable:
          'Requires ongoing human commitment and self-reflection.',
      },
    ],
  },
};

export const DEMO_LIST: DemoMeta[] = [
  {
    id: '1',
    href: '/demo',
    emoji: '🎹',
    label: 'Learn Piano',
    script: PIANO_DEMO,
  },
  {
    id: '2',
    href: '/demo/2',
    emoji: '📈',
    label: 'Build Portfolio',
    script: INVESTING_DEMO,
  },
];
