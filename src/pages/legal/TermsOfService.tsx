import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-solway text-lg font-bold text-[#0A090B] sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3 font-inter text-sm leading-relaxed text-[#4F4D55]">
        {children}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-solway text-base font-semibold text-[#0A090B]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * RYD Learning Terms of Service & Privacy Policy (v1.0).
 * Source: https://docs.google.com/document/d/1J85sp6XmFpRa1qQ0LN3yQkrZAT4Hs3FK_Yv8_Dl7j-I/
 */
export default function TermsOfServicePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[20px] border border-white/60 bg-white/95 p-6 shadow-lg shadow-primary/5 ring-1 ring-[#0A090B]/5 backdrop-blur-sm sm:p-10">
        <p className="text-center font-solway text-sm font-semibold uppercase tracking-wide text-primary">
          RYD Learning
        </p>
        <h1 className="mt-2 text-center font-solway text-2xl font-bold tracking-tight text-[#0A090B] sm:text-3xl">
          Terms of Service & Privacy Policy
        </h1>
        <p className="mt-3 text-center font-inter text-xs text-[#4F4D55] sm:text-sm">
          Version 1.0
        </p>
        <p className="mt-4 font-inter text-sm leading-relaxed text-[#4F4D55]">
          This document governs the use of the RYD Learning platform, including
          the RYD AI Tutor (“Frank & Franca”), related educational services,
          websites, APIs, subscriptions, and learning tools.
        </p>
        <p className="mt-2 font-inter text-sm leading-relaxed text-[#4F4D55]">
          By creating an account, subscribing to the Services, or allowing a
          child to use the platform, you agree to these Terms of Service and
          Privacy Policy.
        </p>

        <div className="mt-10 space-y-10">
          <div>
            <h2 className="mb-6 font-solway text-xl font-bold text-[#0A090B]">
              Part A — Terms of Service
            </h2>
            <div className="space-y-8">
              <Section title="1. About RYD Learning">
                <p>
                  RYD Learning (“RYD”, “we”, “our”, or “us”) is an online
                  educational technology platform that provides coding
                  education, AI-assisted learning experiences, guided exercises,
                  animated instructor delivery, and related educational services
                  for children and learners.
                </p>
                <p>The Services include:</p>
                <BulletList
                  items={[
                    "The RYD Learning platform",
                    "The RYD AI Tutor (“Frank & Franca”)",
                    "Coding lessons and exercises",
                    "Learning progress tracking",
                    "Parent dashboards",
                    "Teacher curriculum tools",
                    "Subscription services",
                    "Related APIs and infrastructure",
                  ]}
                />
                <p>
                  Registered Company Name: RYD Moodle Corporation
                  <br />
                  Website:{" "}
                  <a
                    href="https://www.rydlearning.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    www.rydlearning.com
                  </a>
                  <br />
                  Support Email:{" "}
                  <a
                    href="mailto:learning@rydlearning.com"
                    className="font-medium text-primary hover:underline"
                  >
                    learning@rydlearning.com
                  </a>
                </p>
              </Section>

              <Section title="2. Definitions">
                <SubSection title="“Account”">
                  <p>
                    The parent or guardian account used to access the Services.
                  </p>
                </SubSection>
                <SubSection title="“Child” or “Learner”">
                  <p>
                    A user under the age of 18 using the Services under a parent
                    or guardian account.
                  </p>
                </SubSection>
                <SubSection title="“Parent” or “Guardian”">
                  <p>
                    An adult legally responsible for the Child and the holder of
                    the Account.
                  </p>
                </SubSection>
                <SubSection title="“AI Tutor”">
                  <p>
                    The structured AI-assisted educational system known as
                    “Frank & Franca”.
                  </p>
                </SubSection>
                <SubSection title="“Subscription”">
                  <p>
                    A recurring paid plan that provides access to premium
                    Services.
                  </p>
                </SubSection>
                <SubSection title="“Content”">
                  <p>
                    All lessons, exercises, software, animations, voice content,
                    graphics, text, videos, and educational materials available
                    through the Services.
                  </p>
                </SubSection>
                <SubSection title="“Teacher”">
                  <p>
                    An authenticated educator or educational partner permitted
                    to upload or manage curriculum content using designated
                    teacher tools.
                  </p>
                </SubSection>
              </Section>

              <Section title="3. Eligibility and Accounts">
                <SubSection title="3.1 Parent-Controlled Accounts">
                  <p>Only adults aged 18 years or older may create Accounts.</p>
                  <p>Children may not independently:</p>
                  <BulletList
                    items={[
                      "Register Accounts",
                      "Purchase subscriptions",
                      "Enter into contracts with RYD",
                    ]}
                  />
                  <p>
                    Every Child must use the Services through a Parent or
                    Guardian Account.
                  </p>
                </SubSection>
                <SubSection title="3.2 Responsibility for the Account">
                  <p>The Parent or Guardian:</p>
                  <BulletList
                    items={[
                      "Is responsible for all activity under the Account",
                      "Must supervise the Child’s use of the Services",
                      "Must maintain accurate registration information",
                      "Must keep login credentials secure",
                    ]}
                  />
                </SubSection>
                <SubSection title="3.3 Age Verification">
                  <p>
                    RYD may implement reasonable age-verification and
                    parental-consent mechanisms where required by law.
                  </p>
                </SubSection>
              </Section>

              <Section title="4. Scope of the AI Tutor">
                <SubSection title="4.1 Structured Educational AI">
                  <p>
                    The RYD AI Tutor (“Frank & Franca”) is a structured
                    educational learning system designed to deliver guided
                    coding education.
                  </p>
                  <p>The AI Tutor:</p>
                  <BulletList
                    items={[
                      "Presents pre-authored coding lessons",
                      "Delivers lessons using animated instructors",
                      "Asks curriculum-defined questions",
                      "Provides automated exercise feedback",
                      "Supports revision and guided learning",
                    ]}
                  />
                </SubSection>
                <SubSection title="4.2 No Open Conversational AI">
                  <p>
                    The AI Tutor is not an unrestricted conversational
                    artificial intelligence system.
                  </p>
                  <p>
                    Children cannot freely instruct, prompt, or engage in
                    unrestricted conversations with the system outside the
                    educational framework defined by RYD.
                  </p>
                  <p>
                    All educational flows, lessons, questions, and responses are
                    predefined or constrained by curriculum rules and
                    instructional pathways.
                  </p>
                </SubSection>
                <SubSection title="4.3 Educational Purpose Only">
                  <p>
                    The AI Tutor is designed for educational support and
                    practice.
                  </p>
                  <p>It:</p>
                  <BulletList
                    items={[
                      "Does not replace a human teacher",
                      "Does not provide legal, medical, psychological, or professional advice",
                      "Does not guarantee academic or employment outcomes",
                    ]}
                  />
                </SubSection>
              </Section>

              <Section title="5. AI Services and Third-Party Technologies">
                <p>
                  RYD uses selected third-party technologies to support platform
                  functionality.
                </p>
                <p>These may include:</p>
                <BulletList
                  items={[
                    "Deepgram for text-to-speech voice synthesis",
                    "narrator-avatar / Three.js-based avatar systems for animated instructors",
                    "Stripe for payment processing",
                    "Cloud hosting and analytics providers",
                    "Internal RYD APIs and backend infrastructure",
                  ]}
                />
                <p>
                  Third-party providers process data only as necessary to
                  provide their services and remain governed by their own
                  privacy and security policies.
                </p>
              </Section>

              <Section title="6. Subscriptions and Payments">
                <SubSection title="6.1 Paid Services">
                  <p>
                    Certain Services require a paid Subscription. Pricing,
                    billing cycle, and applicable taxes are displayed before
                    payment is completed.
                  </p>
                </SubSection>
                <SubSection title="6.2 Automatic Renewal">
                  <p>
                    Subscriptions renew automatically unless cancelled before
                    the renewal date. By subscribing, you authorise recurring
                    billing through the selected payment method.
                  </p>
                </SubSection>
                <SubSection title="6.3 Cancellation">
                  <p>Subscriptions may be cancelled at any time.</p>
                  <p>Cancellation:</p>
                  <BulletList
                    items={[
                      "Stops future renewals",
                      "Does not normally refund the current billing period",
                      "Allows access until the current billing period ends",
                    ]}
                  />
                </SubSection>
                <SubSection title="6.4 Payment Processing">
                  <p>
                    Payments are handled by third-party payment processors. RYD
                    does not store full payment-card information.
                  </p>
                </SubSection>
              </Section>

              <Section title="7. Free Demonstration">
                <p>RYD may provide:</p>
                <BulletList
                  items={[
                    "Recorded demonstrations",
                    "Live demos",
                    "Limited feature previews",
                  ]}
                />
                <p>These demonstrations:</p>
                <BulletList
                  items={[
                    "Are not full subscriptions",
                    "May be limited by functionality or duration",
                    "May be modified or removed at any time",
                  ]}
                />
              </Section>

              <Section title="8. Acceptable Use">
                <p>You agree not to:</p>
                <BulletList
                  items={[
                    "Use the Services unlawfully",
                    "Reverse engineer platform systems",
                    "Attempt to extract source code or AI models",
                    "Use platform outputs to train competing AI systems",
                    "Share account access outside authorised users",
                    "Upload harmful or unlawful material",
                    "Attempt unauthorised access to platform infrastructure",
                    "Misrepresent identity or age",
                  ]}
                />
                <p>
                  RYD may suspend or terminate Accounts that violate these
                  Terms.
                </p>
              </Section>

              <Section title="9. Intellectual Property">
                <p>
                  All intellectual property related to the Services remains the
                  property of RYD or its licensors.
                </p>
                <p>This includes:</p>
                <BulletList
                  items={[
                    "Lessons",
                    "Curriculum",
                    "Animations",
                    "Voice assets",
                    "Software",
                    "APIs",
                    "Branding",
                    "AI systems",
                    "Educational content",
                  ]}
                />
                <p>
                  Users receive a limited, non-transferable license to use the
                  Services for personal educational purposes only.
                </p>
              </Section>

              <Section title="10. Teacher and Educational Partner Tools">
                <p>Teacher tools may allow authenticated educators to:</p>
                <BulletList
                  items={[
                    "Upload curriculum content",
                    "Manage educational activities",
                    "Track learner progress",
                  ]}
                />
                <p>
                  Teachers and educational partners must ensure any uploaded
                  material:
                </p>
                <BulletList
                  items={[
                    "Does not infringe intellectual property rights",
                    "Is age-appropriate",
                    "Complies with applicable laws",
                  ]}
                />
              </Section>

              <Section title="11. Suspension and Termination">
                <p>RYD may suspend or terminate Accounts where:</p>
                <BulletList
                  items={[
                    "These Terms are violated",
                    "Fraud or abuse is detected",
                    "Required by law",
                    "Necessary to protect children, users, or platform integrity",
                  ]}
                />
                <p>
                  Where practical, RYD may provide notice and an opportunity to
                  correct violations before termination.
                </p>
              </Section>

              <Section title="12. Service Availability">
                <p>
                  The Services are provided on an “as available” basis. RYD does
                  not guarantee continuous availability, error-free operation,
                  or uninterrupted access. Maintenance, upgrades, technical
                  failures, or third-party outages may affect availability.
                </p>
              </Section>

              <Section title="13. Limitation of Liability">
                <p>
                  To the maximum extent permitted by law, RYD is not liable for:
                </p>
                <BulletList
                  items={[
                    "Indirect or consequential damages",
                    "Loss of learning progress caused by user actions",
                    "Service interruptions",
                    "AI-generated inaccuracies",
                    "Device or internet issues outside RYD’s control",
                    "Business or financial losses",
                  ]}
                />
                <p>
                  Nothing in these Terms excludes rights that cannot legally be
                  excluded under applicable consumer-protection law.
                </p>
              </Section>

              <Section title="14. Changes to the Services or Terms">
                <p>RYD may modify features, pricing, technologies, policies, and these Terms. Where changes are material, reasonable notice will be provided. Continued use of the Services after changes take effect constitutes acceptance of the updated Terms.</p>
              </Section>

              <Section title="15. Governing Law">
                <p>
                  These Terms are governed by the laws of Nigeria, subject to
                  mandatory consumer-protection rights in the user’s home
                  country or region.
                </p>
              </Section>
            </div>
          </div>

          <div>
            <h2 className="mb-6 font-solway text-xl font-bold text-[#0A090B]">
              Part B — Privacy Policy
            </h2>
            <div className="space-y-8">
              <Section title="16. Our Commitment to Children’s Privacy">
                <p>
                  RYD is designed with child privacy and safety as core
                  principles.
                </p>
                <p>RYD:</p>
                <BulletList
                  items={[
                    "Collects the minimum data required to operate the Services",
                    "Does not sell children’s personal data",
                    "Does not use children’s data for behavioural advertising",
                    "Applies privacy-protective settings by default",
                    "Uses age-appropriate educational safeguards",
                  ]}
                />
              </Section>

              <Section title="17. Information We Collect">
                <SubSection title="17.1 Parent Information">
                  <BulletList
                    items={[
                      "Name",
                      "Email address",
                      "Phone number",
                      "Country",
                      "Billing information",
                      "Subscription details",
                    ]}
                  />
                </SubSection>
                <SubSection title="17.2 Child Information">
                  <BulletList
                    items={[
                      "First name or display name",
                      "Age range or grade level",
                      "Learning preferences",
                      "Lesson progress",
                      "Completion status",
                    ]}
                  />
                </SubSection>
                <SubSection title="17.3 Technical Information">
                  <BulletList
                    items={[
                      "Device information",
                      "Browser type",
                      "IP address",
                      "Usage logs",
                      "Security and diagnostics data",
                    ]}
                  />
                </SubSection>
                <SubSection title="17.4 Voice and Audio Processing">
                  <p>Where voice-enabled features are used:</p>
                  <BulletList
                    items={[
                      "Lesson and feedback text may be processed through Deepgram text-to-speech services",
                      "Audio interactions may be temporarily processed to support functionality",
                      "RYD does not build biometric voice profiles of children",
                    ]}
                  />
                </SubSection>
              </Section>

              <Section title="18. How We Use Information">
                <p>RYD uses information to:</p>
                <BulletList
                  items={[
                    "Deliver educational services",
                    "Save lesson progress",
                    "Personalise learning pathways",
                    "Provide parent dashboards",
                    "Process subscriptions",
                    "Improve platform reliability and safety",
                    "Detect fraud or abuse",
                    "Comply with legal obligations",
                  ]}
                />
              </Section>

              <Section title="19. Coding Exercise Processing">
                <p>
                  Coding exercise responses are primarily evaluated locally on
                  the user’s device for immediate educational feedback.
                </p>
                <p>
                  RYD stores limited learning-state information necessary to
                  resume lessons, save completion progress, generate educational
                  reports, and support platform functionality.
                </p>
              </Section>

              <Section title="20. AI Model Training Restriction">
                <p>RYD does not use:</p>
                <BulletList
                  items={[
                    "Student coding submissions",
                    "Lesson interactions",
                    "Voice interactions",
                    "Educational responses",
                    "Child-generated content",
                  ]}
                />
                <p>
                  to train or retrain generative artificial intelligence models.
                  Third-party providers remain subject to their own privacy
                  policies and contractual obligations.
                </p>
              </Section>

              <Section title="21. Data Sharing">
                <p>RYD shares information only where necessary:</p>
                <BulletList
                  items={[
                    "With service providers operating on our behalf",
                    "With payment processors",
                    "With educational partners authorised by the Parent",
                    "Where legally required",
                    "To protect user safety and platform security",
                  ]}
                />
                <p>RYD does not sell children’s personal information.</p>
              </Section>

              <Section title="22. International Data Transfers">
                <p>
                  Because RYD operates internationally, information may be
                  processed in multiple countries. Where legally required, RYD
                  implements safeguards for international data transfers,
                  including contractual protections and security measures.
                </p>
              </Section>

              <Section title="23. Data Retention">
                <p>
                  RYD retains information only as long as necessary for
                  providing Services, legal compliance, security and fraud
                  prevention, and resolving disputes. When information is no
                  longer required, it is securely deleted or anonymised.
                </p>
              </Section>

              <Section title="24. Security Measures">
                <p>
                  RYD maintains technical and organisational safeguards
                  including encryption in transit, access controls,
                  authentication protections, secure infrastructure, and
                  monitoring and incident-response procedures.
                </p>
                <p>
                  No internet-based service can be guaranteed to be completely
                  secure, but RYD takes reasonable measures to protect user
                  information.
                </p>
              </Section>

              <Section title="25. Rights of Parents and Users">
                <p>
                  Depending on applicable law, users may have rights to access,
                  correct, delete, withdraw consent, restrict or object to
                  certain processing, request data portability, and lodge
                  complaints with data-protection authorities.
                </p>
                <p>
                  Requests may be submitted to:{" "}
                  <a
                    href="mailto:learning@rydlearning.com"
                    className="font-medium text-primary hover:underline"
                  >
                    learning@rydlearning.com
                  </a>
                </p>
              </Section>

              <Section title="26. AI Transparency and Human Oversight">
                <p>
                  RYD believes children should interact with AI systems
                  transparently and safely.
                </p>
                <p>Accordingly:</p>
                <BulletList
                  items={[
                    "Children are informed when AI-powered features are used",
                    "AI interactions remain within structured educational boundaries",
                    "Significant educational or account decisions are not made solely through automated processing",
                    "Parents remain responsible for supervising use of the Services",
                    "Human review may occur for safety, abuse prevention, or quality assurance purposes",
                  ]}
                />
              </Section>

              <Section title="27. Cookies and Analytics">
                <p>
                  RYD uses cookies and similar technologies to operate the
                  platform, maintain sessions, remember preferences, and improve
                  functionality and security. Where required by law, consent is
                  obtained before non-essential cookies are used.
                </p>
              </Section>

              <Section title="28. Children’s Privacy Compliance">
                <p>
                  RYD aims to comply with applicable child privacy and
                  consumer-protection laws, including NDPA, UK GDPR, EU GDPR,
                  the UK Children’s Code, COPPA, and PIPEDA. Parents may contact
                  RYD regarding any child privacy concern.
                </p>
              </Section>

              <Section title="29. Changes to This Privacy Policy">
                <p>
                  RYD may update this Privacy Policy periodically. Where changes
                  are material, reasonable notice will be provided through the
                  platform or by email.
                </p>
              </Section>

              <Section title="30. Contact Information">
                <p>
                  RYD Learning
                  <br />
                  Website:{" "}
                  <a
                    href="https://www.rydlearning.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    www.rydlearning.com
                  </a>
                  <br />
                  Email:{" "}
                  <a
                    href="mailto:learning@rydlearning.com"
                    className="font-medium text-primary hover:underline"
                  >
                    learning@rydlearning.com
                  </a>
                  <br />
                  Privacy and Data Requests:{" "}
                  <a
                    href="mailto:learning@rydlearning.com"
                    className="font-medium text-primary hover:underline"
                  >
                    learning@rydlearning.com
                  </a>
                </p>
              </Section>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-center font-inter text-sm">
        <Link
          to={PUBLIC_PATHS.SIGN_UP}
          className="font-medium text-primary hover:underline"
        >
          ← Back to sign up
        </Link>
        <Link
          to={PUBLIC_PATHS.SELECT_PLATFORM}
          className="text-[#4F4D55] hover:underline"
        >
          Back to platforms
        </Link>
      </div>
    </div>
  );
}
