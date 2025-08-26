import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="py-12 px-4 bg-muted border-t">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">iYKELib</h3>
            <p className="text-muted-foreground">
              Empowering computing students across Ghana with open access to quality educational resources.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Browse Resources</a></li>
              <li><a href="#" className="hover:text-foreground">Submit Resource</a></li>
              <li><a href="#" className="hover:text-foreground">About Us</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Computer Science</a></li>
              <li><a href="#" className="hover:text-foreground">Programming</a></li>
              <li><a href="#" className="hover:text-foreground">Web Development</a></li>
              <li><a href="#" className="hover:text-foreground">AI & Machine Learning</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2025 iYKELib. Open access for all students.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
