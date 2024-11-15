import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { graphql } from '@mysten/sui/graphql/schemas/2024.4';

// create SuiGraphQLClient
const client = new SuiGraphQLClient({
  url: 'https://sui-devnet.mystenlabs.com/graphql', // 替换为您的 GraphQL 端点
});

// define GraphQL
const generateQuery = (address: string, type: string) => graphql(`
  query {
  address(address: "${address}") {
    objects(filter: { type: "${type}"}) {
      nodes {
        address
        digest
      }
    }
  }
}`);

export async function fetchObjectId(address: string, type: string) {
  try {
    const _query = generateQuery(address, type)
    // @ts-ignore
    const data = await client.query({ query: _query });
    if (data.data?.address?.objects.nodes.length > 1) {
      // @ts-ignore
      const objectId = data.data?.address?.objects.nodes[0].address;
      return objectId
    } else {
      return null
    }
  } catch (error) {
    console.error('Error fetching objects:', error);
  }
}
