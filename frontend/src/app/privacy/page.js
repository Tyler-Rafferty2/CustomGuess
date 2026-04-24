function Section({ id, title, children }) {
  return (
    <section
      id={id}
      style={{
        marginBottom: "var(--s7)",
        paddingTop: id ? "var(--s5)" : 0,
      }}
    >
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--text-900)",
          marginBottom: "var(--s4)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          color: "var(--text-600)",
          fontSize: "var(--text-base)",
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginBottom: "var(--s5)" }}>
      {title && (
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--text-900)",
            marginBottom: "var(--s3)",
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ color: "var(--text-600)", fontSize: "var(--text-base)", lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

const p = (text) => (
  <p style={{ marginBottom: "var(--s4)" }}>{text}</p>
);

const ul = (items) => (
  <ul style={{ paddingLeft: "var(--s6)", marginBottom: "var(--s4)" }}>
    {items.map((item, i) => (
      <li key={i} style={{ marginBottom: "var(--s2)" }}>{item}</li>
    ))}
  </ul>
);

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "var(--s8) var(--s5)",
        fontFamily: "'DM Sans', sans-serif",
        background: "var(--bg)",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          color: "var(--text-900)",
          marginBottom: "var(--s3)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        Privacy Policy
      </h1>

      <p style={{ color: "var(--text-400)", fontSize: "var(--text-sm)", marginBottom: "var(--s7)" }}>
        Last updated: April 25, 2025
      </p>

      <Section title="Introduction">
        <p style={{ marginBottom: "var(--s4)" }}>
          This Privacy Notice for CustomGuess (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) describes how and why we might access, collect, store, use, and/or share (&quot;process&quot;) your personal information when you use our services (&quot;Services&quot;), including when you visit our website or use our application.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services.
        </p>
      </Section>

      <Section title="Summary of Key Points">
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.
        </p>
      </Section>

      <Section title="Table of Contents">
        <nav>
          <ol style={{ paddingLeft: "var(--s6)", lineHeight: 2 }}>
            {[
              ["#collect", "What Information Do We Collect?"],
              ["#process", "How Do We Process Your Information?"],
              ["#legalbases", "What Legal Bases Do We Rely On?"],
              ["#share", "When and With Whom Do We Share Your Personal Information?"],
              ["#cookies", "Do We Use Cookies and Other Tracking Technologies?"],
              ["#retention", "How Long Do We Keep Your Information?"],
              ["#safe", "How Do We Keep Your Information Safe?"],
              ["#rights", "What Are Your Privacy Rights?"],
              ["#dnt", "Controls for Do-Not-Track Features"],
              ["#usrights", "Do United States Residents Have Specific Privacy Rights?"],
              ["#updates", "Do We Make Updates to This Notice?"],
              ["#contact", "How Can You Contact Us About This Notice?"],
              ["#request", "How Can You Review, Update, or Delete the Data We Collect From You?"],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </Section>

      <Section id="collect" title="1. What Information Do We Collect?">
        <SubSection title="Personal information you disclose to us">
          <p style={{ marginBottom: "var(--s4)" }}>
            We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
          </p>
          <p style={{ marginBottom: "var(--s4)" }}>
            <strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
          </p>
          {ul(["names", "email addresses", "usernames", "passwords"])}
          <p style={{ marginBottom: "var(--s4)" }}>
            <strong>Sensitive Information.</strong> We do not process sensitive information.
          </p>
          <p style={{ marginBottom: "var(--s4)" }}>
            All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
          </p>
        </SubSection>

        <SubSection title="Information automatically collected">
          <p style={{ marginBottom: "var(--s4)" }}>
            We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.
          </p>
          <p style={{ marginBottom: "var(--s4)" }}>
            The information we collect includes:
          </p>
          {ul([
            "Log and Usage Data. Service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services, which may include your IP address, device information, browser type and settings, and information about your activity in the Services.",
            "Device Data. We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services, including device identifiers, browser type, and operating system.",
            "Location Data. We collect location data such as information about your device's location, which can be either precise or imprecise.",
          ])}
        </SubSection>
      </Section>

      <Section id="process" title="2. How Do We Process Your Information?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We process your personal information for a variety of reasons, depending on how you interact with our Services, including:
        </p>
        {ul([
          "To facilitate account creation and authentication and otherwise manage user accounts.",
          "To deliver and facilitate delivery of services to the user.",
          "To respond to user inquiries and offer support to users.",
          "To send administrative information to you.",
          "To fulfill and manage your orders.",
          "To enable user-to-user communications.",
          "To request feedback.",
          "To send you marketing and promotional communications (where permitted).",
          "To deliver targeted advertising to you.",
          "To protect our Services.",
          "To identify usage trends.",
          "To determine the effectiveness of our marketing and promotional campaigns.",
          "To save or protect an individual's vital interest.",
        ])}
      </Section>

      <Section id="legalbases" title="3. What Legal Bases Do We Rely On to Process Your Information?">
        <p style={{ marginBottom: "var(--s4)" }}>
          If you are located in the EU or UK, this section applies to you. The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information.
        </p>
        {ul([
          "Consent. We may process your information if you have given us permission to use your personal information for a specific purpose.",
          "Performance of a Contract. We may process your personal information when we believe it is necessary to fulfill our contractual obligations to you.",
          "Legitimate Interests. We may process your information when we believe it is reasonably necessary to achieve our legitimate business interests.",
          "Legal Obligations. We may process your information where we believe it is necessary for compliance with our legal obligations.",
          "Vital Interests. We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party.",
        ])}
        <p style={{ marginBottom: "var(--s4)" }}>
          If you are located in Canada, we may process your information with your express or implied consent, or under a legal exception where permitted by applicable law.
        </p>
      </Section>

      <Section id="share" title="4. When and With Whom Do We Share Your Personal Information?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We may need to share your personal information in the following situations:
        </p>
        {ul([
          "Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.",
          "Other Users. When you share personal information or otherwise interact in the public areas with other users, such information may be viewed by all users and may be publicly distributed outside.",
          "Offer Wall. Our application may display a third-party hosted offer wall. If you choose to interact with an offer, your information may be shared with the offer wall provider.",
        ])}
      </Section>

      <Section id="cookies" title="5. Do We Use Cookies and Other Tracking Technologies?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, tailor advertisements to your interests, or send abandoned shopping cart reminders. The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear on our Services or on other websites.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
        </p>
      </Section>

      <Section id="retention" title="6. How Long Do We Keep Your Information?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible, then we will securely store your personal information and isolate it from any further processing until deletion is possible.
        </p>
      </Section>

      <Section id="safe" title="7. How Do We Keep Your Information Safe?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.
        </p>
      </Section>

      <Section id="rights" title="8. What Are Your Privacy Rights?">
        <p style={{ marginBottom: "var(--s4)" }}>
          Depending on your location, you may have certain rights under applicable data protection laws. These may include the right to request access to and obtain a copy of your personal information, to request rectification or erasure, to restrict the processing of your personal information, and if applicable, to data portability.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          In some regions (like the EEA, UK, Switzerland, and Canada) you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time. To exercise these rights, please contact us using the details provided in Section 12 below.
        </p>
        <SubSection title="Withdrawing your consent">
          <p style={{ marginBottom: "var(--s4)" }}>
            If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us using the contact details provided in Section 12. However, this will not affect the lawfulness of the processing before its withdrawal.
          </p>
        </SubSection>
        <SubSection title="Account Information">
          <p style={{ marginBottom: "var(--s4)" }}>
            If you would like to review or change the information in your account or terminate your account, you can log in to your account settings and update your user account, or contact us using the information provided.
          </p>
          <p style={{ marginBottom: "var(--s4)" }}>
            Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms, and/or comply with applicable legal requirements.
          </p>
        </SubSection>
        <SubSection title="Cookies and similar technologies">
          <p style={{ marginBottom: "var(--s4)" }}>
            Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services.
          </p>
        </SubSection>
      </Section>

      <Section id="dnt" title="9. Controls for Do-Not-Track Features">
        <p style={{ marginBottom: "var(--s4)" }}>
          Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (&quot;DNT&quot;) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.
        </p>
      </Section>

      <Section id="usrights" title="10. Do United States Residents Have Specific Privacy Rights?">
        <p style={{ marginBottom: "var(--s4)" }}>
          If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Montana, New Hampshire, New Jersey, Oregon, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information.
        </p>
        <p style={{ marginBottom: "var(--s4)" }}>
          <strong>Categories of Personal Information We Collect</strong>
        </p>
        <div
          style={{
            overflowX: "auto",
            marginBottom: "var(--s5)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--surface-1)" }}>
                <th style={{ padding: "var(--s3) var(--s4)", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-900)" }}>
                  Category
                </th>
                <th style={{ padding: "var(--s3) var(--s4)", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-900)" }}>
                  Examples
                </th>
                <th style={{ padding: "var(--s3) var(--s4)", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-900)" }}>
                  Collected
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Identifiers", "Contact details such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name", "YES"],
                ["Personal information as defined in the California Customer Records statute", "Name, contact information, education, employment, employment history, and financial information", "YES"],
                ["Protected classification characteristics under state or federal law", "Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data", "NO"],
                ["Commercial information", "Transaction information, purchase history, financial details, and payment information", "NO"],
                ["Biometric information", "Fingerprints and voiceprints", "NO"],
                ["Internet or other similar network activity", "Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements", "NO"],
                ["Geolocation data", "Device location", "NO"],
                ["Audio, electronic, sensory, or similar information", "Images and audio, video or call recordings created in connection with our business activities", "NO"],
                ["Professional or employment-related information", "Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications", "NO"],
                ["Education information", "Student records and directory information", "NO"],
                ["Inferences drawn from collected personal information", "Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual's preferences and characteristics", "NO"],
                ["Sensitive personal information", "", "NO"],
              ].map(([category, examples, collected], i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "var(--s3) var(--s4)", color: "var(--text-900)", fontWeight: 500, verticalAlign: "top" }}>{category}</td>
                  <td style={{ padding: "var(--s3) var(--s4)", color: "var(--text-600)", verticalAlign: "top" }}>{examples}</td>
                  <td style={{ padding: "var(--s3) var(--s4)", color: collected === "YES" ? "var(--state-live)" : "var(--text-400)", fontWeight: 600, verticalAlign: "top" }}>{collected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginBottom: "var(--s4)" }}>
          We will use and retain the collected personal information as needed to provide the Services or for as long as the user has an account with us.
        </p>
        <SubSection title="Your Rights">
          <p style={{ marginBottom: "var(--s4)" }}>
            You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. Depending on your state, these rights may include:
          </p>
          {ul([
            "Right to know whether or not we are processing your personal data",
            "Right to access your personal data",
            "Right to correct inaccuracies in your personal data",
            "Right to request the deletion of your personal data",
            "Right to obtain a copy of the personal data you previously shared with us",
            "Right to non-discrimination for exercising your rights",
            "Right to opt out of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects",
          ])}
        </SubSection>
        <SubSection title="How to Exercise Your Rights">
          <p style={{ marginBottom: "var(--s4)" }}>
            To exercise these rights, you can contact us by submitting a data subject access request, by emailing us at customguess@gmail.com, or by referring to the contact details at the bottom of this document.
          </p>
          <p style={{ marginBottom: "var(--s4)" }}>
            Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.
          </p>
        </SubSection>
        <SubSection title="Request Verification">
          <p style={{ marginBottom: "var(--s4)" }}>
            Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request.
          </p>
        </SubSection>
        <SubSection title="Appeals">
          <p style={{ marginBottom: "var(--s4)" }}>
            Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at customguess@gmail.com. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions.
          </p>
        </SubSection>
        <SubSection title="California &quot;Shine The Light&quot; Law">
          <p style={{ marginBottom: "var(--s4)" }}>
            California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in Section 12.
          </p>
        </SubSection>
      </Section>

      <Section id="updates" title="11. Do We Make Updates to This Notice?">
        <p style={{ marginBottom: "var(--s4)" }}>
          We may update this Privacy Notice from time to time. The updated version will be indicated by an updated &quot;Revised&quot; date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.
        </p>
      </Section>

      <Section id="contact" title="12. How Can You Contact Us About This Notice?">
        <p style={{ marginBottom: "var(--s4)" }}>
          If you have questions or comments about this notice, you may contact us at:
        </p>
        <address
          style={{
            fontStyle: "normal",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "var(--s4) var(--s5)",
            color: "var(--text-600)",
            fontSize: "var(--text-base)",
            lineHeight: 1.8,
          }}
        >
          CustomGuess<br />
          customguess@gmail.com
        </address>
      </Section>

      <Section id="request" title="13. How Can You Review, Update, or Delete the Data We Collect From You?">
        <p style={{ marginBottom: "var(--s4)" }}>
          Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. To request to review, update, or delete your personal information, please fill out and submit a data subject access request or contact us at customguess@gmail.com.
        </p>
      </Section>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "var(--s7) 0 var(--s5)" }} />
      <p style={{ color: "var(--text-400)", fontSize: "var(--text-xs)", textAlign: "center" }}>
        This privacy policy was created with assistance from Termly.
      </p>
    </main>
  );
}
