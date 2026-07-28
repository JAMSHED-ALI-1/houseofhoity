import React from 'react'
import styles from '../../styles/ Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* Brand */}
        <div className={styles.brand}>
          <h2 className={styles.logo}>SHOP</h2>
          <p className={styles.tagline}>Quality products, delivered fast.</p>
        </div>

        {/* Links */}
        <div className={styles.links}>
          <div className={styles.column}>
            <h4 className={styles.heading}>Shop</h4>
            <ul>
              <li><a href="#">New Arrivals</a></li>
              <li><a href="#">Best Sellers</a></li>
              <li><a href="#">Sale</a></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4 className={styles.heading}>Support</h4>
            <ul>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Returns</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4 className={styles.heading}>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Shop. All rights reserved.</p>
        <div className={styles.legal}>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer