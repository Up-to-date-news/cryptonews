import { Link } from 'react-router-dom';
import { InstagramIcon, TelegramIcon, TwitterIcon } from './icons.jsx';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-social">
        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <InstagramIcon size={19} />
        </a>
        <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <TelegramIcon size={19} />
        </a>
        <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <TwitterIcon size={19} />
        </a>
      </div>

      <div className="site-footer-links">
        <Link to="/terms">Terms &amp; Conditions</Link>
        <span className="site-footer-copyright">© {year} up to date news. All rights reserved.</span>
      </div>
    </footer>
  );
}
