var pageInfo = {pending: true};

async function fetchPageInfo()
{
    return await fetch('./pagedata.json')
	.then((response) => response.json())
	.then((json) => {pageInfo = json; pageInfo.pending = false});
}
fetchPageInfo();
export {pageInfo};
