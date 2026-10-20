import { ExamCollection } from '../types/test-practice';

export const mockExamCollections: ExamCollection[] = [
  {
    id: 'recent-actual-test',
    title: 'Recent Actual Test',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    isHot: true,
    isBookmarked: false,
    skillsIncluded: ['Listening', 'Reading'],
    testsCount: 10,
    completedTestsCount: 1,
    tests: [
      {
        id: 'test-1',
        orderNumber: 1,
        title: 'Test 1',
        skills: [
          {
            skill: 'Listening',
            status: 'completed',
            latestBandScore: 4.5,
            attempts: [
              {
                id: 'att-rat-test1-lis',
                attemptNumber: 1,
                submittedAt: '21:31 12/10/2026',
                bandScore: 4.5,
              },
            ],
          },
          {
            skill: 'Reading',
            status: 'completed',
            latestBandScore: 4.0,
            attempts: [
              {
                id: 'att-rat-test1-read',
                attemptNumber: 1,
                submittedAt: '15:43 12/10/2026',
                bandScore: 4.0,
              },
            ],
          },
        ],
      },
      {
        id: 'test-2',
        orderNumber: 2,
        title: 'Test 2',
        skills: [
          {
            skill: 'Listening',
            status: 'not_started',
            attempts: [],
          },
          {
            skill: 'Reading',
            status: 'not_started',
            attempts: [],
          },
        ],
      },
      {
        id: 'test-3',
        orderNumber: 3,
        title: 'Test 3',
        skills: [
          {
            skill: 'Listening',
            status: 'draft',
            draftTime: '10:15 14/10/2026',
            attempts: [],
          },
          {
            skill: 'Reading',
            status: 'not_started',
            attempts: [],
          },
        ],
      },
      {
        id: 'test-4',
        orderNumber: 4,
        title: 'Test 4',
        skills: [
          {
            skill: 'Listening',
            status: 'not_started',
            attempts: [],
          },
          {
            skill: 'Reading',
            status: 'not_started',
            attempts: [],
          },
        ],
      },
    ],
  },
  {
    id: 'prep-exclusive-tests',
    title: 'IELTS - Prep Exclusive Tests',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    isHot: true,
    isBookmarked: false,
    skillsIncluded: ['Listening', 'Reading', 'Writing', 'Speaking'],
    testsCount: 10,
    completedTestsCount: 0,
    tests: [
      {
        id: 'exclusive-test-1',
        orderNumber: 1,
        title: 'Exclusive Test 1',
        skills: [
          { skill: 'Listening', status: 'not_started', attempts: [] },
          { skill: 'Reading', status: 'not_started', attempts: [] },
          { skill: 'Writing', status: 'not_started', hasVirtualRoom: true, attempts: [] },
          { skill: 'Speaking', status: 'not_started', hasVirtualRoom: true, attempts: [] },
        ],
      },
      {
        id: 'exclusive-test-2',
        orderNumber: 2,
        title: 'Exclusive Test 2',
        skills: [
          { skill: 'Listening', status: 'not_started', attempts: [] },
          { skill: 'Reading', status: 'not_started', attempts: [] },
          { skill: 'Writing', status: 'not_started', hasVirtualRoom: true, attempts: [] },
          { skill: 'Speaking', status: 'not_started', hasVirtualRoom: true, attempts: [] },
        ],
      },
    ],
  },
  {
    id: 'prep-exam-library-1',
    title: 'IELTS - Prep Exam Library 1',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    isHot: true,
    isBookmarked: true,
    skillsIncluded: ['Listening', 'Reading', 'Writing', 'Speaking'],
    testsCount: 10,
    completedTestsCount: 0,
    tests: [
      {
        id: 'library-test-1',
        orderNumber: 1,
        title: 'Exam Library Test 1',
        skills: [
          { skill: 'Listening', status: 'not_started', attempts: [] },
          { skill: 'Reading', status: 'not_started', attempts: [] },
          { skill: 'Writing', status: 'not_started', hasVirtualRoom: true, attempts: [] },
          { skill: 'Speaking', status: 'not_started', hasVirtualRoom: true, attempts: [] },
        ],
      },
    ],
  },
  {
    id: 'ielts-writing-latest-real-tests',
    title: 'IELTS Writing - Latest Real Tests',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    isHot: false,
    isBookmarked: false,
    skillsIncluded: ['Writing'],
    testsCount: 8,
    completedTestsCount: 1,
    tests: [
      {
        id: 'wt-1',
        orderNumber: 1,
        title: 'WT1: Comparative graph (the percentage of males and females with driving licenses)',
        skills: [
          {
            skill: 'Writing',
            status: 'not_started',
            hasVirtualRoom: true,
            attempts: [],
          },
        ],
      },
      {
        id: 'wt-2',
        orderNumber: 2,
        title: 'WT2: Higher Education Funding',
        skills: [
          {
            skill: 'Writing',
            status: 'completed',
            hasVirtualRoom: true,
            latestBandScore: 6.5,
            attempts: [
              {
                id: 'att-wt-2-1',
                attemptNumber: 1,
                submittedAt: '19:40 16/10/2026',
                bandScore: 6.5,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ielts-speaking-forecast',
    title: 'IELTS Speaking Forecast Quý 4',
    imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80',
    isHot: false,
    isBookmarked: true,
    skillsIncluded: ['Speaking'],
    testsCount: 6,
    completedTestsCount: 1,
    tests: [
      {
        id: 'spk-1',
        orderNumber: 1,
        title: 'Full Test 1: Saying thank you, Wild animals and Politeness',
        skills: [
          {
            skill: 'Speaking',
            status: 'completed',
            hasVirtualRoom: true,
            latestBandScore: 8.0,
            attempts: [
              {
                id: 'att-spk-1-1',
                attemptNumber: 1,
                submittedAt: '09:20 18/10/2026',
                bandScore: 8.0,
              },
            ],
          },
        ],
      },
      {
        id: 'spk-2',
        orderNumber: 2,
        title: 'Full Test 2: Study and Work, Crowded places and Concentration',
        skills: [
          {
            skill: 'Speaking',
            status: 'not_started',
            hasVirtualRoom: true,
            attempts: [],
          },
        ],
      },
    ],
  },
];
