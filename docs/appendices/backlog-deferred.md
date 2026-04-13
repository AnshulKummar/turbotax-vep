# Deferred Backlog --- Friction Themes 6--10

> These five friction themes were identified in the Voice of Customer analysis but are deferred from the MVP and Phase 1 scope. They represent real customer pain but are either (a) lower severity than Themes 1--5, (b) outside the Virtual Expert Platform's direct control, or (c) better addressed by existing Intuit workstreams. They are documented here for completeness and to inform Phase 2+ prioritization.

## Summary Table

| # | Friction theme | Severity | % of 88 quote sample | Root cause layer | Deferred rationale |
|---|---|---|---|---|---|
| 6 | Pricing opacity and unexpected charges | 3 | 9% | Checkout funnel (outside VEP scope) | Owned by Consumer Group pricing team; FTC consent order already constrains changes |
| 7 | Document upload and processing failures | 4 | 5% | Pre-work (Layer 1) | Addressed partially by B3 document ingestion; full fix requires mobile camera pipeline work |
| 8 | Refund timing and status confusion | 3 | 8% | Post-filing workflow (outside VEP scope) | IRS processing timelines are external; status tracking is a separate product surface |
| 9 | Mobile experience gaps | 3 | 4% | Client application (outside VEP scope) | Mobile app team owns responsive experience; VEP workbench is desktop-first for experts |
| 10 | Accessibility and language barriers | 4 | 3% | Routing + client application | Language matching is addressed by B5 routing; broader accessibility requires platform investment |

---

## Theme 6: Pricing Opacity and Unexpected Charges (9%)

**What customers report.** Customers describe being surprised by the final price of TurboTax Live services, often after they have already invested significant time in the filing process. Common patterns include: upgrades triggered by adding a form (Schedule C, Schedule E, K-1) that the customer did not anticipate, unclear pricing differences between Live Assisted and Live Full Service, and charges for expert time that the customer believed was included in the base price.

**Representative examples:**
- Customer begins in Live Assisted at an advertised price, adds a Schedule C for freelance income, and is prompted to upgrade to a higher tier. The upgrade price is $150 more than expected. The customer feels locked in because they have already entered 45 minutes of data.
- Customer selects Live Full Service expecting a flat fee. At checkout, additional charges appear for state filing and "complex return" surcharges. The total is $280 more than the price shown on the landing page.
- Customer is charged for a Live expert consultation that they understood to be included in their subscription tier. The charge appears on their credit card without a clear in-product confirmation.

**Severity rationale.** Severity 3 (not 5) because the financial impact is the overcharge itself (typically $100--$300), not a downstream tax error. However, the trust erosion is significant --- several customers in the sample describe the pricing experience as "bait and switch," which poisons their perception of the expert experience even when the expert interaction itself is positive.

**Why deferred.** Pricing and checkout funnel design are owned by the Consumer Group pricing team, not the Virtual Expert Platform. The FTC consent order (2024) already constrains how Intuit can present pricing for "free" tiers. The VEP redesign does not touch the checkout funnel.

---

## Theme 7: Document Upload and Processing Failures (5%)

**What customers report.** Customers describe uploading documents (W-2, 1099, K-1 scans) that the platform fails to parse correctly, leading to incorrect pre-population, repeated upload requests, or lost documents.

**Representative examples:**
- Customer uploads a brokerage 1099-B with 47 transactions. The OCR misreads cost basis on 12 lots, requiring the customer to manually correct each entry. The customer questions why they are paying for Full Service if they must verify every line.
- Customer uploads a K-1 PDF from their partnership. The system does not recognize the form and asks them to re-upload. After three attempts, the expert asks the customer to manually read the K-1 values over the phone.
- Customer uploads all required documents on day one. Two weeks later, the expert requests the same documents, stating they cannot find them in the system.

**Severity rationale.** Severity 4 because document failures directly contribute to accuracy errors (Theme 1) and delays (Theme 2). The mechanical root cause is in the ingestion pipeline.

**Why deferred.** Big Bet B3 addresses document ingestion for the expert workbench with OCR plus structured form parsing. However, the full mobile camera-to-document pipeline (which is where most consumer upload failures originate) is a separate engineering workstream. The MVP uses synthetic hand-crafted documents and does not build a production OCR pipeline.

---

## Theme 8: Refund Timing and Status Confusion (8%)

**What customers report.** Customers describe confusion about when their refund will arrive, conflicting information from the platform versus the IRS, and a lack of proactive status updates after filing.

**Representative examples:**
- Customer files via Full Service on February 15. The platform shows "refund in 21 days." After 28 days with no refund, the customer contacts support and is told the IRS is processing and there is no way to check status beyond the IRS "Where's My Refund" tool. The customer feels the platform abandoned them after filing.
- Customer's return is flagged by the IRS for identity verification (Form 5071C). The customer receives an IRS letter but no notification from TurboTax. They call support and are told TurboTax has no visibility into post-filing IRS actions.
- Customer receives their refund but the amount differs from the TurboTax estimate by $800. No explanation is provided in the platform. The customer must call both TurboTax and the IRS to understand the discrepancy.

**Severity rationale.** Severity 3 because the root cause is largely external (IRS processing timelines, identity verification holds). The TurboTax platform's control is limited to status communication, not the actual refund timeline.

**Why deferred.** Post-filing workflow, including IRS notice handling and refund tracking, is explicitly a Phase 2 non-goal in the PRD (Section 6). The Multi-Year Tax Co-Pilot (B2) creates the foundation for year-round status tracking, but production integration with IRS transcript data is beyond MVP scope.

---

## Theme 9: Mobile Experience Gaps (4%)

**What customers report.** Customers using the TurboTax mobile app describe limitations in the expert interaction experience: difficulty sharing screens with experts, inability to view documents side-by-side during a call, chat interfaces that lose context when the app backgrounds, and document upload failures specific to mobile camera capture.

**Representative examples:**
- Customer attempts to photograph a K-1 using the mobile app's camera feature. The image is rejected as "unreadable" three times. The customer gives up and waits until they can access a scanner.
- Customer is on a Live Assisted video call via the mobile app. They need to reference a 1099-B while speaking with the expert, but switching to the document view disconnects the video call.
- Customer uses in-app chat to ask an expert a follow-up question. They switch to another app briefly, and when they return, the chat session has ended with a message saying "session timed out due to inactivity."

**Severity rationale.** Severity 3 because the friction is real but affects a smaller subset of users (those who rely exclusively on mobile for the expert interaction). Most Full Service customers use desktop for the primary filing session.

**Why deferred.** The VEP expert workbench is designed as a desktop-first experience for experts. The customer-facing mobile experience is owned by the TurboTax mobile app team. Responsive design for the customer-facing goal capture flow (B1) is in scope for Phase 2 but not the MVP.

---

## Theme 10: Accessibility and Language Barriers (3%)

**What customers report.** Customers describe difficulty communicating with experts due to language barriers, lack of availability of experts who speak their preferred language, and accessibility gaps in the platform interface.

**Representative examples:**
- Spanish-speaking customer requests an expert who speaks Spanish. They are told no Spanish-speaking experts are available and are offered a callback in 48 hours. The customer files with an English-speaking expert and reports that key nuances about their immigration-related tax situation were lost in translation.
- Customer with a visual impairment reports that the TurboTax Live screen-sharing feature is not compatible with their screen reader. They must rely entirely on the phone conversation, which makes it difficult to follow along as the expert walks through the return.
- Customer whose primary language is Mandarin describes being matched with an expert who speaks Cantonese. The customer appreciates the effort but notes that the two languages are not mutually intelligible for technical tax terminology.

**Severity rationale.** Severity 4 because the impact on affected customers is high --- they are effectively excluded from the full value of the expert experience. However, the affected population is a small percentage of the overall customer base in the sample.

**Why deferred.** Language matching is partially addressed by B5 (Specialty Match Routing Marketplace), which includes language as a routing dimension. Full accessibility compliance (WCAG 2.1 AA) for the expert workbench is a requirement for production deployment but is not in MVP scope. Broader platform accessibility (screen reader support, captioning for video calls) requires investment from the core TurboTax client application team.
