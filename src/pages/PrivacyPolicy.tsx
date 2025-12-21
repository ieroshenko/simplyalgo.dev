import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const content = `
# Privacy Policy

**Last Updated: December 19, 2025**

At SimplyAlgo, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.

## 1. Information We Collect
We only collect the information necessary to provide you with our services. This includes:
- **Account Information:** When you sign in via Google or GitHub, we receive your name, email address, and profile picture.
- **Usage Data:** We may collect information about how you interact with our platform, such as the problems you solve and your progress.

## 2. How We Use Your Information
We use the collected information for the following purposes:
- To provide and maintain our services.
- To personalize your experience and track your progress.
- To communicate with you about updates or support requests.
- To improve our platform based on user feedback and usage patterns.

## 3. Data Retention
We retain your information only for as long as needed to provide our services and fulfill the purposes outlined in this policy. You can request deletion of your account and data at any time through your settings or by contacting us.

## 4. Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties. We may share data with trusted service providers who assist us in operating our website or conducting our business, provided they agree to keep this information confidential.

## 5. Security
We implement a variety of security measures to maintain the safety of your personal information. Your data is stored securely using Supabase and other industry-standard technologies.

## 6. Cookies
We use cookies to enhance your experience and remember your login session. You can choose to disable cookies through your browser settings, but some features of the service may not function properly.

## 7. Your Rights
You have the right to access, correct, or delete your personal information. If you wish to exercise these rights, please contact us.

## 8. Changes to This Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.

## 9. Contact Us
If you have any questions regarding this Privacy Policy, you can reach us at privacy@simplyalgo.dev.
`;

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="hover:bg-accent group transition-all"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1" />
                    Back to Login
                </Button>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
