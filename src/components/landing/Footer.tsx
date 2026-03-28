import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="container mx-auto px-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
        {/* Brand */}
        <div>
          <Link to="/" className="text-xl font-bold text-primary">
            Vox
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            AI phone receptionist for Indian businesses
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">How it works</a></li>
            <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
            <li><Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Login</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">IT Act Compliance</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">DPDP Compliance</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Contact</h4>
          <a
            href="mailto:customer@voxai.in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            customer@voxai.in
          </a>
        </div>
      </div>

      <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © 2026 Vox. All rights reserved. Made with ❤️ in India
      </div>
    </div>
  </footer>
);

export default Footer;
