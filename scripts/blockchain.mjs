import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';

// Use the project-compatible bundled runtime without changing the user's global Node.
const [command, ...args] = process.argv.slice(2);
if (Number(process.versions.node.split('.')[0]) < 24) {
  const runtime = process.env.VYNLT_NODE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin', process.platform === 'win32' ? 'node.exe' : 'node');
  await access(runtime);
  const child = spawn(runtime, [process.argv[1], command, ...args], { stdio: 'inherit', windowsHide: true });
  child.on('exit', code => process.exit(code ?? 1));
} else if (command === 'node') {
  const child = spawn(process.execPath, ['node_modules/hardhat/dist/src/cli.js', 'node', '--hostname', '127.0.0.1', '--port', '8545'], { stdio: 'inherit', windowsHide: true });
  child.on('exit', code => process.exit(code ?? 1));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
} else if (command === 'compile') {
  const solc = (await import('solc')).default;
  const source = await readFile('contracts/VynltReportAnchor.sol', 'utf8');
  const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'VynltReportAnchor.sol': { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
  if (output.errors?.some(e => e.severity === 'error')) throw new Error(output.errors.map(e => e.formattedMessage).join('\n'));
  const contract = output.contracts['VynltReportAnchor.sol'].VynltReportAnchor;
  await mkdir('.local/blockchain', { recursive: true });
  await writeFile('.local/blockchain/contract.json', JSON.stringify({ abi: contract.abi, bytecode: '0x' + contract.evm.bytecode.object, compiler: solc.version(), sourceHash: createHash('sha256').update(source).digest('hex') }, null, 2));
  console.log('Compiled VYNLT local anchor contract.');
} else if (command === 'deploy') {
  const { JsonRpcProvider, Wallet, ContractFactory, hexlify, keccak256 } = await import('ethers');
  const rpcUrl = process.env.VYNLT_CHAIN_RPC ?? 'http://127.0.0.1:8545';
  const url = new URL(rpcUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only credential-free loopback RPC origins are supported');
  const provider = new JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
  try {
    if ((await provider.getNetwork()).chainId !== 31337n) throw new Error('Expected local chain 31337');
    // Publicly known Hardhat development account; never use it with real assets.
    const wallet = Wallet.fromPhrase('test test test test test test test test test test test junk').connect(provider);
    const artifact = JSON.parse(await readFile('.local/blockchain/contract.json', 'utf8'));
    const instanceId = hexlify(randomBytes(32));
    const contract = await new ContractFactory(artifact.abi, artifact.bytecode, wallet).deploy(instanceId);
    const receipt = await contract.deploymentTransaction().wait(1);
    const address = await contract.getAddress();
    const manifest = { version: 1, rpcUrl, chainId: 31337, address, instanceId, writer: wallet.address, runtimeHash: keccak256(await provider.getCode(address)), deploymentTx: receipt.hash, deploymentBlockHash: receipt.blockHash, sourceHash: artifact.sourceHash };
    await writeFile('.local/blockchain/deployment.json', JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await writeFile('.local/blockchain/signer.json', JSON.stringify({ privateKey: wallet.privateKey }), { mode: 0o600 });
    console.log('Deployed VYNLT local anchor. Instance:', instanceId, 'Contract:', address);
  } finally { provider.destroy(); }
} else if (command === 'verify') {
  const { verifyExport } = await import('../dist/server/anchor.js');
  const [reportFile, proofFile] = args;
  if (!reportFile || !proofFile) throw new Error('Usage: npm run chain:verify -- report.json proof.json');
  const result = await verifyExport(JSON.parse(await readFile(resolve(reportFile), 'utf8')), JSON.parse(await readFile(resolve(proofFile), 'utf8')), process.env.VYNLT_CHAIN_DEPLOYMENT ?? '.local/blockchain/deployment.json');
  console.log(JSON.stringify(result, null, 2));
  if (result.result !== 'matching') process.exitCode = 1;
} else { throw new Error('Expected node, compile, deploy or verify'); }
