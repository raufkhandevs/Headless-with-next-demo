/**
 * Scenario:
 * We are using Next.js's Static Site Generation to fetch data from a WordPress backend
 * using GraphQL and display ACF blocks on a single page.
 * */

// *****************************************************************************
// lib/apolloClient.js
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

/**
 * create the Apollo Client
 */
const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://your-wordpress-site.com/graphql',
  }),
  cache: new InMemoryCache(),
});

// export default client;

// *****************************************************************************
// lib/queries.js
import { gql } from '@apollo/client';

/**
 * query to fetch a page blocks by slug
 */
export const GET_PAGE_BY_SLUG = gql`
  query GetPageBySlug($slug: String!) {
    pageBy(uri: $slug) {
      title
      content
      acf {
        blocks {
          ... on AcfBlockType1 {
            field1
            field2
          }
          ... on AcfBlockType2 {
            fieldA
            fieldB
          }
        }
      }
    }
  }
`;

// *****************************************************************************
/** Use getStaticProps to fetch data at build time: */
// pages/[slug].js
import { ApolloProvider } from '@apollo/client';
import client from '../lib/apolloClient';
import { GET_PAGE_BY_SLUG } from '../lib/queries';
import BlockRender from '../components/BlockRender';

const Page = ({ pageData }) => {
  return (
    <ApolloProvider client={client}>
      <div>
        <h1>{pageData.title}</h1>
        <BlockRender blocks={pageData.acf.blocks} />
      </div>
    </ApolloProvider>
  );
};

export async function getStaticPaths() {
  // Fetch all slugs (or paths) from WordPress
  const { data } = await client.query({
    query: gql`
      {
        pages {
          nodes {
            uri
          }
        }
      }
    `,
  });

  const paths = data.pages.nodes.map((page) => ({
    params: { slug: page.uri.replace(/\//g, '') }, 
  }));

  return {
    paths,
    fallback: false, 
  };
}

export async function getStaticProps(context) {
  const { slug } = context.params;

  const { data } = await client.query({
    query: GET_PAGE_BY_SLUG,
    variables: { slug: `/${slug}` },
  });

  return {
    props: {
      pageData: data.pageBy,
    },
    revalidate: 60, 
  };
}

// export default Page;

// *****************************************************************************
// components/BlockRender.js
import React from 'react';
import Header from '../components/Header';
import PrimaryBanner from '../components/PrimaryBanner';
import SecondaryBanner from '../components/SecondaryBanner';
import Content from '../components/Content';
import Footer from '../components/Footer';

const BlockRender = ({ blocks }) => {
  return (
    <div>
      {blocks.map((block, index) => {
        switch (block.__typename) {
          case 'acf/header':
            return <Header key={index} {...block} />;
          case 'acf/primary-banner':
            return <PrimaryBanner key={index} {...block} />;
          case 'acf/secondary-banner':
            return <SecondaryBanner key={index} {...block} />;
          case 'acf/content':
            return <Content key={index} {...block} />;
          /**
           * we can add more block types here, as we want to build pages for each block type
           */
          case 'acf/footer':
            return <Footer key={index} {...block} />;
          default:
            return <div key={index}>Unknown block type</div>;
        }
      })}
    </div>
  );
};

// export default BlockRender;
