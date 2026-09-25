import type { ExamBank } from '../../src/core/types';

/**
 * Sample bank 2 — original questions written for this app.
 *
 * This one carries community vote distributions and discussion posts so the
 * dump-site features (consensus bars, disputed-answer warnings) can be seen
 * without importing anything. Question 4 deliberately has a wrong "vendor" key
 * that the community disagrees with, to demonstrate the DISPUTED badge.
 */
export const CLOUD_BANK: ExamBank = {
  id: 'sample-cld-201',
  code: 'CLD-201',
  title: 'Cloud Administration Essentials',
  vendor: 'Sample Content',
  description:
    'Original practice questions on cloud identity, storage, networking and resilience, with community-answer features enabled.',
  passingScore: 75,
  timeLimitMinutes: 45,
  questionCount: 10,
  version: '1.0',
  source: 'built-in',
  sections: [
    { id: 'identity', title: 'Identity & Access', weight: 0.3 },
    { id: 'storage', title: 'Storage', weight: 0.25 },
    { id: 'network', title: 'Networking', weight: 0.25 },
    { id: 'resilience', title: 'Resilience & Cost', weight: 0.2 },
  ],
  questions: [
    {
      id: 'cld-201-q1',
      bankId: 'sample-cld-201',
      sectionId: 'identity',
      type: 'single',
      number: 1,
      stem: 'A company must require a second authentication factor only when a user signs in from an unfamiliar location. Which control should you configure?',
      choices: [
        { id: 'A', text: 'A conditional access policy with sign-in risk conditions' },
        { id: 'B', text: 'Per-user multi-factor authentication for everyone' },
        { id: 'C', text: 'A password expiry policy of 30 days' },
        { id: 'D', text: 'An IP allow-list on the storage account' },
      ],
      correct: ['A'],
      explanation:
        'Conditional access evaluates signals such as location and risk at sign-in and applies MFA only when the condition matches. Blanket per-user MFA cannot be scoped by location.',
      communityAnswer: 'A',
      communityVotes: [
        { answer: 'A', count: 88 },
        { answer: 'B', count: 12 },
      ],
      difficulty: 2,
    },
    {
      id: 'cld-201-q2',
      bankId: 'sample-cld-201',
      sectionId: 'identity',
      type: 'single',
      number: 2,
      stem: 'Which principle states that an account should be granted only the permissions required to perform its task, and no more?',
      choices: [
        { id: 'A', text: 'Defence in depth' },
        { id: 'B', text: 'Least privilege' },
        { id: 'C', text: 'Separation of duties' },
        { id: 'D', text: 'Zero trust' },
      ],
      correct: ['B'],
      explanation:
        'Least privilege limits an identity to the minimum permissions needed. Separation of duties splits a sensitive task across people, which is a related but distinct control.',
      communityAnswer: 'B',
      communityVotes: [{ answer: 'B', count: 96 }],
      difficulty: 1,
    },
    {
      id: 'cld-201-q3',
      bankId: 'sample-cld-201',
      sectionId: 'storage',
      type: 'multiple',
      number: 3,
      stem: 'You need to reduce the cost of storing audit logs that are read roughly once a year but must be retained for seven years. Which two actions should you take? (Choose two.)',
      choices: [
        { id: 'A', text: 'Move the logs to an archive or cold storage tier' },
        { id: 'B', text: 'Enable a lifecycle policy that transitions objects automatically by age' },
        { id: 'C', text: 'Replicate the logs to three additional regions' },
        { id: 'D', text: 'Store the logs on premium SSD-backed volumes' },
      ],
      correct: ['A', 'B'],
      selectCount: 2,
      explanation:
        'Archive tiers cost far less per gigabyte in exchange for slow retrieval, which suits annual reads. A lifecycle policy applies the transition without manual work. Extra replication and premium disks both increase cost.',
      communityAnswer: 'AB',
      communityVotes: [
        { answer: 'AB', count: 91 },
        { answer: 'AD', count: 9 },
      ],
      difficulty: 2,
    },
    {
      id: 'cld-201-q4',
      bankId: 'sample-cld-201',
      sectionId: 'resilience',
      type: 'single',
      number: 4,
      stem: 'An application must survive the loss of an entire data centre within a single region, with no data loss. Which deployment gives the strongest guarantee?',
      choices: [
        { id: 'A', text: 'Multiple instances in a single availability zone' },
        { id: 'B', text: 'Instances spread across availability zones with synchronous replication' },
        { id: 'C', text: 'A single instance with nightly snapshots' },
        { id: 'D', text: 'Instances in a second region with asynchronous replication' },
      ],
      // Deliberately wrong key, kept to demonstrate the DISPUTED badge.
      correct: ['D'],
      explanation:
        'An availability zone maps to one or more physically separate data centres within a region. Spreading instances across zones with synchronous replication survives the loss of a data centre with a recovery point objective of zero. Cross-region asynchronous replication survives a whole-region loss but can lose in-flight writes, so it does not meet the "no data loss" requirement.',
      communityAnswer: 'B',
      communityVotes: [
        { answer: 'B', count: 79 },
        { answer: 'D', count: 21 },
      ],
      discussion: [
        {
          author: 'netops_sam',
          date: '2026-02-11',
          content:
            'The key says D but the requirement is zero data loss. Async replication cannot promise that. B is correct.',
          suggested: 'B',
          upvotes: 34,
        },
        {
          author: 'cloudlearner22',
          date: '2026-02-14',
          content:
            'Agreed — D protects against a regional outage, which the question does not ask for. Went with B and it matched the official docs.',
          suggested: 'B',
          upvotes: 11,
        },
      ],
      difficulty: 3,
    },
    {
      id: 'cld-201-q5',
      bankId: 'sample-cld-201',
      sectionId: 'network',
      type: 'single',
      number: 5,
      stem: 'Which component allows virtual machines with only private IP addresses to make outbound internet requests without accepting inbound connections?',
      choices: [
        { id: 'A', text: 'A NAT gateway' },
        { id: 'B', text: 'An internet-facing load balancer' },
        { id: 'C', text: 'A VPN gateway' },
        { id: 'D', text: 'A public IP attached to each VM' },
      ],
      correct: ['A'],
      explanation:
        'A NAT gateway translates outbound traffic to a shared public address and, being stateful, permits only return traffic. A public load balancer and per-VM public IPs both expose inbound surface.',
      communityAnswer: 'A',
      communityVotes: [
        { answer: 'A', count: 93 },
        { answer: 'B', count: 7 },
      ],
      difficulty: 2,
    },
    {
      id: 'cld-201-q6',
      bankId: 'sample-cld-201',
      sectionId: 'storage',
      type: 'hotspot',
      number: 6,
      stem: 'Choose the most appropriate storage service for each workload.',
      hotspots: [
        {
          id: 'h-media',
          label: 'Serving static images to a public website',
          options: ['Object storage', 'Block storage', 'Relational database'],
          correct: 'Object storage',
        },
        {
          id: 'h-db',
          label: 'The disk backing a transactional database server',
          options: ['Object storage', 'Block storage', 'Archive storage'],
          correct: 'Block storage',
        },
        {
          id: 'h-backup',
          label: 'Seven-year retention of compliance records',
          options: ['Archive storage', 'Block storage', 'In-memory cache'],
          correct: 'Archive storage',
        },
      ],
      correct: ['h-media=Object storage', 'h-db=Block storage', 'h-backup=Archive storage'],
      explanation:
        'Object storage suits immutable, HTTP-addressable content. Databases need low-latency random writes from block devices. Rarely read, long-retention data belongs in an archive tier.',
      difficulty: 2,
    },
    {
      id: 'cld-201-q7',
      bankId: 'sample-cld-201',
      sectionId: 'resilience',
      type: 'single',
      number: 7,
      stem: 'A recovery point objective (RPO) of 15 minutes means which of the following?',
      choices: [
        { id: 'A', text: 'The service must be restored within 15 minutes of an outage' },
        { id: 'B', text: 'At most 15 minutes of data may be lost in a disaster' },
        { id: 'C', text: 'Backups must complete in under 15 minutes' },
        { id: 'D', text: 'Failover testing must run every 15 minutes' },
      ],
      correct: ['B'],
      explanation:
        'RPO bounds acceptable data loss. The time to restore service is the recovery time objective (RTO), which is a separate target.',
      communityAnswer: 'B',
      communityVotes: [
        { answer: 'B', count: 89 },
        { answer: 'A', count: 11 },
      ],
      difficulty: 2,
    },
    {
      id: 'cld-201-q8',
      bankId: 'sample-cld-201',
      sectionId: 'network',
      type: 'multiple',
      number: 8,
      stem: 'A security review requires that a database server accepts connections only from the application subnet. Which two controls achieve this? (Choose two.)',
      choices: [
        { id: 'A', text: 'A network security rule allowing only the application subnet on the database port' },
        { id: 'B', text: 'A private endpoint with public network access disabled' },
        { id: 'C', text: 'Enabling transparent data encryption at rest' },
        { id: 'D', text: 'Rotating the database administrator password monthly' },
      ],
      correct: ['A', 'B'],
      selectCount: 2,
      explanation:
        'Both controls restrict network reachability. Encryption at rest protects stored data but does not limit who can connect, and password rotation is an identity control.',
      communityAnswer: 'AB',
      communityVotes: [
        { answer: 'AB', count: 84 },
        { answer: 'AC', count: 16 },
      ],
      difficulty: 3,
    },
    {
      id: 'cld-201-q9',
      bankId: 'sample-cld-201',
      sectionId: 'identity',
      type: 'ordering',
      number: 9,
      stem: 'Put the steps of granting an application access to a storage account in the correct order.',
      choices: [
        { id: 'A', text: 'Create a managed identity for the application' },
        { id: 'B', text: 'Assign the identity a role scoped to the storage account' },
        { id: 'C', text: 'Configure the application to request a token for that identity' },
        { id: 'D', text: 'Remove the hard-coded access key from the application configuration' },
      ],
      correct: ['A', 'B', 'C', 'D'],
      explanation:
        'Create the identity, grant it least-privilege access, switch the application to token-based authentication, and only then remove the old key — removing it first would break the running application.',
      difficulty: 2,
    },
    {
      id: 'cld-201-q10',
      bankId: 'sample-cld-201',
      sectionId: 'resilience',
      type: 'truefalse',
      number: 10,
      stem: 'Enabling autoscaling removes the need to set any upper bound on the number of instances.',
      choices: [
        { id: 'A', text: 'True' },
        { id: 'B', text: 'False' },
      ],
      correct: ['B'],
      explanation:
        'An upper bound is what stops a traffic spike or a runaway loop from generating unbounded cost. Autoscaling policies should always define both a minimum and a maximum.',
      communityAnswer: 'B',
      communityVotes: [{ answer: 'B', count: 94 }],
      difficulty: 1,
    },
  ],
};
