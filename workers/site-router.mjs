export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname.toLowerCase() === 'www.elbowroommassage.com') {
      url.protocol = 'https:';
      url.hostname = 'elbowroommassage.com';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
