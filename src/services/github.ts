export class GitHubService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'GitHub API Error');
    }
    return res.json();
  }

  async getUserRepositories() {
    return this.fetchAPI('/user/repos?sort=updated');
  }

  async getRepoContents(fullPath: string) {
    // Basic implementation for a single level or recursive if needed
    // For simplicity, we'll fetch the default branch's tree
    const repoInfo = await this.fetchAPI(`/repos/${fullPath}`);
    const defaultBranch = repoInfo.default_branch;
    const tree = await this.fetchAPI(`/repos/${fullPath}/git/trees/${defaultBranch}?recursive=1`);
    
    // Filter for blobs (files)
    const blobs = tree.tree.filter((item: any) => item.type === 'blob');
    
    const files = await Promise.all(blobs.map(async (blob: any) => {
      const contentData = await this.fetchAPI(`/repos/${fullPath}/git/blobs/${blob.sha}`);
      const binary = atob(contentData.content.replace(/\n/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const content = new TextDecoder().decode(bytes);
      return {
        id: blob.sha,
        name: blob.path.split('/').pop() || blob.path,
        content: content,
        language: this.detectLanguage(blob.path),
        path: blob.path
      };
    }));
    
    return files;
  }

  private detectLanguage(path: string) {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'py': return 'python';
      case 'json': return 'json';
      default: return 'text';
    }
  }

  async pushToRepo(repoName: string, files: any[], commitMessage: string = 'Update from Mistri AI') {
    // 1. Get user login
    const user = await this.fetchAPI('/user');
    const owner = user.login;

    // 2. Try to find or create repo
    let repo;
    try {
      repo = await this.fetchAPI(`/repos/${owner}/${repoName}`);
    } catch (e) {
      repo = await this.fetchAPI('/user/repos', {
        method: 'POST',
        body: JSON.stringify({ name: repoName, auto_init: true })
      });
    }

    // 3. Simple push logic (creating/updating files individually for simplicity)
    // In a real app, you'd use a single commit with multiple trees
    for (const file of files) {
      let sha;
      try {
        const existingFile = await this.fetchAPI(`/repos/${owner}/${repoName}/contents/${file.path}`);
        sha = existingFile.sha;
      } catch (e) {
        // file doesn't exist
      }

      await this.fetchAPI(`/repos/${owner}/${repoName}/contents/${file.path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(file.content))),
          sha: sha
        })
      });
    }
  }
}
