const getAuthorInfo = async (params: { name?: string, contact?: string }) => {
  const name = params.name || "Hal AI";
  const contact = params.contact || "rimaizumi.biz@misclib.com";

  return {
    "Author": name,
    "Contact": contact
  }
};

export default getAuthorInfo;