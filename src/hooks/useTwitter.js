export const useTwitter = () => {
  const GetToken = async () => {
    try {
      const callback = 'https://darts.bkkleague.com/auth/twitter'
      const url = 'https://api.twitter.com/oauth/request_token'
      const query = `oauth_callback=${encodeURIComponent(callback)}`
      const oauth_consumer_key = 'BGpevnzuLeoft9174HmGl3X4N'
      const consumer_secret =
        'bwhLrPe3ehYmmqbm9udELqDc4AaBMHHLmWvYut7HkXQ1qd3Ptb'
      const oauth_nonce = Date.now()
      const timestamp = Date.now()
      const parameterString = `callback=${callback}&oauth_consumer_key=${oauth_consumer_key}&oauth_nonce=${oauth_nonce}&oauth_singature_method=HMAC-SHA1&oauth_timestamp=${timestamp}&oauth_version=1.0`
      const signatureBaseString = `POST&${encodeURI(url)}&${encodeURI(
        parameterString,
      )}`
      const signingKey = `${consumer_secret}&`
      const bytes = CryptoJS.HmacSHA1(signatureBaseString, signingKey)
      console.log('bytes', bytes)
      const signature = bytes.toString('base64')
      console.log(signature)
      const authHeader = `OAuth oauth_consumer_key="${oauth_consumer_key}", oauth_nonce="${oauth_nonce}", oauth_signature="${signature}",  oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_version="1.0"`
      const res = await fetch(`${url}?${query}`, {
        method: 'POST',
        headers: {
          Authorization: `${authHeader}`,
        },
      })
      console.log(JSON.stringify(res, null, 2))
    } catch (e) {
      console.log(JSON.stringify(e, null, 2))
      console.log('twitter gettoken', e)
    }
  }
  return {GetToken}
}