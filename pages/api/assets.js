const CREDORA_API_URL = 'https://platform.credora.io/api/v2/graphql';

export default async function handler(req, res) {
  const { GraphQLClient, gql } = await import('graphql-request');
  console.log('api/assets.js handler invoked');
  if (req.method !== 'GET') {
    console.log('Request method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.CREDORA_CLIENT_ID;
  const clientSecret = process.env.CREDORA_CLIENT_SECRET;
  console.log('Request headers:', JSON.stringify(req.headers));
  console.log('CREDORA_CLIENT_ID:', clientId);
  console.log('CREDORA_CLIENT_SECRET:', clientSecret ? clientSecret.slice(0, 4) + '...' : undefined);
  if (!clientId || !clientSecret) {
    console.error('Missing Credora API credentials');
    return res.status(500).json({ error: 'Missing Credora API credentials' });
  }

  // Use the full query from Credora docs
  const query = gql`
    query {
      getAssetRatings(limit: 100) {
        totalCount
        items {
          id
          address
          symbol
          chainId
          consensusMetrics {
            consensusRating
            consensusPd
            consensusScore
          }
          credoraMetrics {
            rating
            pd
            score
            status
            publishDate
            validUntil
            underReview
            methodology
            report
            lgd {
              min
              max
            }
          }
        }
      }
    }
  `;

  try {
    console.log('About to make request to Credora API with credentials as headers...');
    const client = new GraphQLClient(CREDORA_API_URL, {
      headers: {
        clientId: clientId,
        clientSecret: clientSecret,
      },
    });
    const data = await client.request(query);
    console.log('Credora API response:', JSON.stringify(data).slice(0, 500));
    console.log('Returning items count:', data.getAssetRatings.items.length);
    res.status(200).json(data.getAssetRatings.items);
    console.log('Response sent to client.');
  } catch (error) {
    console.error('Credora API error:', error);
    res.status(500).json({ error: error.message, details: error });
  }
} 