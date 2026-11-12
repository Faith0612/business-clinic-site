# Business Clinic: blog and CMS setup

## How it works
- Articles live as small files in `content/blog/`. The CMS creates and edits these files for you.
- On every deploy, Netlify runs `node scripts/build-blog.mjs`, which builds the Blog page, each article page, the sitemap and robots.txt into `dist/`.
- The CMS dashboard is at **your-site-address/admin/**
- Publishing in the CMS saves the file to GitHub. Netlify sees the change and redeploys automatically (usually within a minute or two).

## One-time setup (do this once, ideally on a laptop or desktop browser)

### 1. Put the site on GitHub
1. Create a free account at github.com.
2. Create a new repository (for example `business-clinic-website`). Private is fine.
3. Upload everything inside this folder to the repository (on github.com choose Add file, then Upload files, and drag in the files and folders). Make sure `admin`, `content`, `scripts`, `templates`, `images`, `package.json`, `netlify.toml` and `site.json` are all included.

### 2. Tell the CMS which repository to use
1. In GitHub, open `admin/config.yml` and click the pencil icon.
2. Replace `YOUR-GITHUB-USERNAME/YOUR-REPO-NAME` with your own, for example `faith123/business-clinic-website`.
3. Commit the change.

### 3. Add your site address
1. Open `site.json` in GitHub and set `"siteUrl"` to your live address with no trailing slash, for example `"https://businessclinic.netlify.app"`.
2. Commit. This switches on canonical links, share images and the sitemap.

### 4. Connect Netlify to the repository
1. In Netlify open your site, then Site configuration, then Build and deploy, and link the site to your GitHub repository (branch `main`).
2. The build settings are already in `netlify.toml`: build command `node scripts/build-blog.mjs`, publish folder `dist`.

### 5. Let the CMS log in with GitHub
1. In GitHub open Settings, then Developer settings, then OAuth Apps, and choose New OAuth App.
2. Homepage URL: your site address. Authorization callback URL: `https://api.netlify.com/auth/done`
3. Copy the Client ID and generate a Client Secret.
4. In Netlify open Site configuration, then Access and security, then OAuth, install the GitHub provider and paste in the Client ID and Client Secret.
   (Netlify moves menu names around from time to time. If you cannot find it, search "Netlify OAuth GitHub provider Decap CMS".)

### 6. Check it
Open `your-site-address/admin/`, choose Login with GitHub, and you should see "Blog Articles".

## Publishing a new article
1. Open `your-site-address/admin/` and log in.
2. Blog Articles, then New Blog Article.
3. Fill in: Blog title, SEO title, Meta description, URL slug, Publish date, Featured image (and a short image description), then write the article.
4. Leave **Published** off to save a draft. Switch it **on** and save to publish.
5. Wait a minute or two for Netlify to redeploy. The article appears on the Blog page and gets its own page.

To **unpublish**, open the article, switch Published off and save.

## Writing tips that the site understands
- The first one to three paragraphs become the preview on the Blog page, and the article page continues after them.
- To show the **Free Diagnosis button**, put a link to `/free-diagnosis.html` in a paragraph on its own.
- To link to one-on-one support, link the relevant words to `/sales-recovery.html` inside a paragraph.
- Related Articles are added automatically.
