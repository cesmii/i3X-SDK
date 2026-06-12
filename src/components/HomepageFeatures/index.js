import clsx from 'clsx';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Server Developers',
    img: '/img/i3X_Server.png',
    link: '/Server-Developers/overview',
    description: (
      <>
        Access the technical documentation for server implementations, providing everything needed to integrate, configure, and integrate I3X on your existing infrastructure or platforms.
      </>
    ),
  },
  {
    title: 'Client Developers',
    img: '/img/i3X_Client.png',
    link: '/Client-Developers/overview',
    description: (
      <>
        Build responsive, user-facing experiences with ease. Connect with i3X via documentation, code samples and resources that
        enable seamless integration, smooth interactions, and efficient data access directly within your applications.
      </>
    ),
  },

];

function Feature({img, title, description, link}) {
  const imgUrl = useBaseUrl(img);
  return (
    <div className={clsx('col col-4')}>
      <div className="text--center">
        {link ? (
          <a href={useBaseUrl(link)}>
            <img src={imgUrl} className={styles.featureSvg} alt={title} />
          </a>
        ) : (
          <img src={imgUrl} className={styles.featureSvg} alt={title} />
        )}
      </div>
      <div className="text--center padding-horiz--md">
        {link ? (
          <a href={useBaseUrl(link)} style={{textDecoration: 'none', color: 'inherit'}}>
            <Heading as="h3">{title}</Heading>
          </a>
        ) : (
          <Heading as="h3">{title}</Heading>
        )}
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  const bgUrl = useBaseUrl('/img/i3X_Background-100.jpg');
  return (
    <section className={styles.features} style={{backgroundImage: `url(${bgUrl})`}}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
