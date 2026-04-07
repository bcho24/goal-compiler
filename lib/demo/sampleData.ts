import type { DemoScript } from './types';

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
