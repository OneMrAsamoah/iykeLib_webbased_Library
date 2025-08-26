import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Globe, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-4xl py-20 px-4">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About iYKELib</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            iYKELib is an open-access library of computing resources for students across Ghana.
            We collect, curate and surface high-quality textbooks, tutorials, and lecture notes
            so learners can find the materials they need to succeed.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                To democratize access to computing education in Ghana by building a
                community-driven collection of openly available learning resources.
                We prioritize quality, clarity, and accessibility.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Who we serve</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Students, instructors, and self-learners across universities, colleges,
                and bootcamps who need dependable, well-organized computing materials.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/auth?tab=signup") }>
                  <Users className="mr-2 h-4 w-4" /> Join Community
                </Button>
                <Button size="sm" onClick={() => navigate("/categories") }>
                  <Globe className="mr-2 h-4 w-4" /> Browse Resources
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Get in touch</h2>
          <p className="text-muted-foreground mb-4">
            Have suggestions or resources to share? We welcome contributions and feedback.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="ghost" size="sm">
              <Mail className="mr-2 h-4 w-4" /> contact@iykelib.org
            </Button>
            <Button variant="ghost" size="sm">
              <Globe className="mr-2 h-4 w-4" /> https://iykelib.org
            </Button>
          </div>
        </section>

        <footer className="text-sm text-muted-foreground border-t pt-6">
          <p>&copy; 2025 iYKELib. Open access for all students.</p>
        </footer>
      </main>
    </div>
  );
};

export default About;
