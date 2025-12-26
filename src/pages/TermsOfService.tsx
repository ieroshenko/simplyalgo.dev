import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const TermsOfService = () => {
    const navigate = useNavigate();

    const content = `
# Terms of Service

**Last Updated: December 19, 2025**

Welcome to SimplyAlgo. By using our website and services, you agree to be bound by the following terms and conditions.

## 1. Acceptance of Terms
By accessing or using SimplyAlgo, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.

## 2. Description of Service
SimplyAlgo provides a platform for coding interview preparation, including AI-guided tutoring, progress tracking, and practice problems. We reserve the right to modify or discontinue any part of the service at any time.

## 3. User Accounts
To access certain features, you must create an account using Google or GitHub authentication. You are responsible for maintaining the security of your account and for all activities that occur under your account.

## 4. Intellectual Property
All content on SimplyAlgo, including text, graphics, logos, and code, is the property of SimplyAlgo or its content suppliers and is protected by intellectual property laws. You may not use, reproduce, or distribute any content without our express written permission.

## 5. Prohibited Conduct
You agree not to use SimplyAlgo for any unlawful purpose or in any way that could damage, disable, or impair the service. This includes, but is not limited to:
- Attempting to gain unauthorized access to our systems.
- Interfering with other users' enjoyment of the service.
- Using the service to distribute spam or malicious software.

## 6. Limitation of Liability
SimplyAlgo is provided "as is" without any warranties, express or implied. We shall not be liable for any damages arising from your use of the service, including but not limited to direct, indirect, incidental, or consequential damages.

## 7. Governing Law
These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SimplyAlgo operates, without regard to its conflict of law provisions.

## 8. Changes to Terms
We reserve the right to update these Terms of Service at any time. We will notify users of any significant changes by posting the new terms on our website. Your continued use of the service after such changes constitutes your acceptance of the new terms.

## 9. Contact Us
If you have any questions about these Terms of Service, please contact us at support@simplyalgo.dev.
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

export default TermsOfService;
