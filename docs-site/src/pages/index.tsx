import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/academy/intro">
            📚 Start Learning
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            style={{ marginLeft: '1rem' }}
            to="/docs/manual/overview">
            📖 User Manual
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({ title, description, link, emoji }: { title: string; description: string; link: string; emoji: string }) {
  return (
    <div className="col col--4" style={{ padding: '1rem' }}>
      <div className="card" style={{ height: '100%', padding: '1.5rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{emoji}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <Link to={link} className="button button--primary button--sm">
          Learn More →
        </Link>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Scan2Plan Academy"
      description="Training, documentation, and best practices for Scan2Plan OS">
      <HomepageHeader />
      <main style={{ padding: '2rem 0' }}>
        <div className="container">
          <div className="row">
            <FeatureCard
              emoji="🎯"
              title="Sales Pipeline"
              description="Learn to manage leads, deals, and the staleness engine."
              link="/docs/academy/sales-pipeline"
            />
            <FeatureCard
              emoji="💰"
              title="CPQ Quote Builder"
              description="Master pricing, disciplines, LOD, and margin gates."
              link="/docs/academy/cpq-quote-builder"
            />
            <FeatureCard
              emoji="📄"
              title="Proposals"
              description="Build winning proposals with templates and case studies."
              link="/docs/academy/proposal-builder"
            />
          </div>
          <div className="row" style={{ marginTop: '1rem' }}>
            <FeatureCard
              emoji="🏭"
              title="Production Workflow"
              description="Track projects from scan to delivery with quality gates."
              link="/docs/academy/production-workflow"
            />
            <FeatureCard
              emoji="📱"
              title="FieldHub Mobile"
              description="Field tech interface, GPS tracking, and voice notes."
              link="/docs/academy/fieldhub-mobile"
            />
            <FeatureCard
              emoji="🤖"
              title="AI Features"
              description="AI assistant, smart extraction, and auto-generation."
              link="/docs/academy/ai-features"
            />
          </div>
        </div>
      </main>
    </Layout>
  );
}
